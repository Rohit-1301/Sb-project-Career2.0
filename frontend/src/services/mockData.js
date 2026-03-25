export const mockJobs = [
  {
    id: '1',
    title: 'Machine Learning Engineer',
    company: 'NeuralTech AI',
    location: 'Remote',
    salary: '$120k - $160k',
    match: 95,
    skills: ['Python', 'TensorFlow', 'PyTorch'],
    type: 'Full-time',
    posted: '2 days ago',
    description: 'Looking for an experienced ML engineer to build scalable AI models for our core product suite.',
    logo: 'NT'
  },
  {
    id: '2',
    title: 'Data Scientist',
    company: 'Analytics Next',
    location: 'New York, NY',
    salary: '$110k - $145k',
    match: 88,
    skills: ['Python', 'SQL', 'Scikit-Learn'],
    type: 'Full-time',
    posted: '1 week ago',
    description: 'Join our data team to extract actionable insights from large datasets and inform business decisions.',
    logo: 'AN'
  },
  {
    id: '3',
    title: 'AI Product Manager',
    company: 'FutureWorks',
    location: 'San Francisco, CA (Hybrid)',
    salary: '$130k - $180k',
    match: 75,
    skills: ['Product Strategy', 'AI/ML', 'Agile'],
    type: 'Full-time',
    posted: '3 days ago',
    description: 'Bridge the gap between engineering and users to deliver cutting-edge AI products.',
    logo: 'FW'
  },
  {
    id: '4',
    title: 'NLP Edge Researcher',
    company: 'Lingua.ai',
    location: 'Remote',
    salary: '$140k - $200k',
    match: 92,
    skills: ['Python', 'HuggingFace', 'LLMs'],
    type: 'Contract',
    posted: 'Just now',
    description: 'Research and implement novel Natural Language Processing techniques for conversational AI on edge devices.',
    logo: 'LA'
  },
];

export const mockInsights = [
  { id: 1, category: 'Top Skill Match', value: 'Python', percentage: 95 },
  { id: 2, category: 'Hot Industry', value: 'Generative AI', percentage: 88 },
  { id: 3, category: 'Salary Trend', value: 'Up 12%', percentage: 12 },
];

export const mockActivity = [
  { id: 1, action: 'Viewed Job', target: 'Machine Learning Engineer at NeuralTech', time: '2 hours ago' },
  { id: 2, action: 'Updated Profile', target: 'Added "TensorFlow" to skills', time: '1 day ago' },
  { id: 3, action: 'Chat', target: 'Career guidance session', time: '2 days ago' },
];

export const generateAiResponse = (message) => {
  const msg = message.toLowerCase();
  
  if (msg.includes('job') || msg.includes('work') || msg.includes('role')) {
    return "Based on your strong Python and AI background, I highly recommend looking at the 'Machine Learning Engineer' role at NeuralTech AI. It's a 95% match for your profile! You can find it in the Jobs section.";
  }
  
  if (msg.includes('skill') || msg.includes('learn') || msg.includes('improve')) {
    return "To boost your match rates for Senior Data Scientist roles, you should consider diving deeper into PyTorch and big data frameworks like Apache Spark. Let me know if you want learning resource recommendations.";
  }

  if (msg.includes('hello') || msg.includes('hi ')) {
    return "Hi there! I'm your CareerSathi AI. How can I assist with your career goals today?";
  }

  return "That's an interesting point. To give you the best career advice, could you tell me more about your specific goals, or try asking me about job recommendations or skill gaps?";
};
