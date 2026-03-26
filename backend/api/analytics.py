from fastapi import APIRouter, HTTPException, Query
import pandas as pd
import json
import os
import re

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(os.path.dirname(BASE_DIR), "data")
WELLFOUND_FILE = os.path.join(DATA_DIR, "wellfound_jobs.json")
INTERNSHALA_FILE = os.path.join(DATA_DIR, "internshala_jobs.json")

def parse_wellfound_salary(salary_str):
    if not isinstance(salary_str, str) or not salary_str:
        return None
    
    # Example format: "$140k - $200k"
    matches = re.findall(r'\$?(\d+)[kK]?', salary_str)
    if matches:
        try:
            nums = [int(m) * 1000 for m in matches] # Assuming 'k' for all for simplicity in wellfound
            return sum(nums) / len(nums)
        except:
            pass
    return None

def parse_internshala_stipend(stipend_str):
    if not isinstance(stipend_str, str) or not stipend_str:
        return None
    # Example format: "\u20b9 45,000 /month" or "\u20b9 15,000-20,000 /month"
    s = stipend_str.replace(',', '')
    matches = re.findall(r'(\d+)', s)
    if matches:
        try:
            nums = [int(m) for m in matches]
            avg_stipend = sum(nums) / len(nums)
            # Typically stipends are monthly. Convert to yearly? Let's leave as monthly for internships.
            return avg_stipend
        except:
            pass
    return None

def get_wellfound_data():
    if not os.path.exists(WELLFOUND_FILE):
        return []
    with open(WELLFOUND_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    if not data:
        return []
    
    df = pd.DataFrame(data)
    df['platform'] = 'wellfound'
    
    # Parse salary
    if 'salary' in df.columns:
        df['parsed_salary'] = df['salary'].apply(parse_wellfound_salary)
    else:
        df['parsed_salary'] = None
        
    return df

def get_internshala_data():
    if not os.path.exists(INTERNSHALA_FILE):
        return []
    with open(INTERNSHALA_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    if not data:
        return []
    
    df = pd.DataFrame(data)
    df['platform'] = 'internshala'
    
    if 'stipend' in df.columns:
        df['parsed_salary'] = df['stipend'].apply(parse_internshala_stipend)
    else:
        df['parsed_salary'] = None
        
    return df

@router.get("/dashboard")
async def get_analytics_dashboard(platform: str = Query("all", description="Filter by platform (wellfound, internshala, all)")):
    try:
        df_w = get_wellfound_data()
        df_i = get_internshala_data()
        
        dfs = []
        if isinstance(df_w, pd.DataFrame) and not df_w.empty and platform in ["all", "wellfound"]:
            dfs.append(df_w)
        if isinstance(df_i, pd.DataFrame) and not df_i.empty and platform in ["all", "internshala"]:
            dfs.append(df_i)
            
        if not dfs:
            return {"salary_distribution": [], "locations": [], "job_types": []}
            
        # Avoid pandas FutureWarning by dropping all-NA columns before concat
        clean_dfs = [df.dropna(axis=1, how='all') for df in dfs]
        combined_df = pd.concat(clean_dfs, ignore_index=True)
        
        # 1. Salary Distribution (Average salary by job title cluster)
        salary_dist = []
        if 'parsed_salary' in combined_df.columns and 'title' in combined_df.columns:
            # Group by title prefix or generic role to avoid too many small buckets
            sal_df = combined_df.dropna(subset=['parsed_salary']).copy()
            
            # Very basic clustering: count top 10 titles
            top_titles = sal_df['title'].value_counts().nlargest(10).index
            sal_grouped = sal_df[sal_df['title'].isin(top_titles)].groupby('title')['parsed_salary'].mean().reset_index()
            sal_grouped = sal_grouped.sort_values(by='parsed_salary', ascending=False)
            
            for _, row in sal_grouped.iterrows():
                salary_dist.append({"name": row['title'][:30], "avg_salary": round(row['parsed_salary'])})
                
        # 2. Location Distribution
        locations = []
        if 'location' in combined_df.columns:
            # Clean location strings (sometimes they are lists or complex strings)
            def clean_loc(loc):
                if isinstance(loc, list):
                    return loc[0] if loc else "Remote"
                if isinstance(loc, str):
                    return loc.split(",")[0].strip()
                return "Unknown"
                
            combined_df['clean_location'] = combined_df['location'].apply(clean_loc)
            loc_counts = combined_df['clean_location'].value_counts().nlargest(10).reset_index()
            loc_counts.columns = ['name', 'count']
            
            for _, row in loc_counts.iterrows():
                locations.append({"name": row['name'], "value": row['count']})
                
        # 3. Job Types (Full-time vs Internship) -> Inferred from platform or 'job_type' column
        job_types = []
        if 'job_type' in combined_df.columns:
            type_counts = combined_df['job_type'].value_counts().reset_index()
            type_counts.columns = ['name', 'value']
            for _, row in type_counts.iterrows():
                job_types.append({"name": str(row['name']), "value": row['value']})
        else:
            # Fallback: Internshala = Internship, Wellfound = Full-time
            type_counts = combined_df['platform'].value_counts().reset_index()
            type_counts.columns = ['platform', 'count']
            for _, row in type_counts.iterrows():
                name = "Internship" if row['platform'] == 'internshala' else "Full-time"
                job_types.append({"name": name, "value": row['count']})
                
        return {
            "salary_distribution": salary_dist,
            "locations": locations,
            "job_types": job_types,
            "total_jobs": len(combined_df)
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error generating analytics: {str(e)}")
