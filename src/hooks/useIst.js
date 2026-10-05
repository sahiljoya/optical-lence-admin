import { useState, useEffect } from "react";

export function useIst() {
  const [now, setNow] = useState(null);
  
  useEffect(() => { 
    setNow(new Date()); 
    const id = setInterval(() => setNow(new Date()), 30000); 
    return () => clearInterval(id); 
  }, []);
  
  if (!now) return { d: "", t: "" };
  
  const d = new Intl.DateTimeFormat("en-GB", { 
    timeZone: "Asia/Kolkata", 
    day: "2-digit", 
    month: "short", 
    year: "numeric" 
  }).format(now);
  
  const t = new Intl.DateTimeFormat("en-US", { 
    timeZone: "Asia/Kolkata", 
    hour: "2-digit", 
    minute: "2-digit", 
    hour12: true 
  }).format(now);
  
  return { d, t };
}
