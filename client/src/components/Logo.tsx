import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = "w-24 h-24" }) => {
  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <circle cx="150" cy="150" r="150" fill="black"/>
        <path 
          d="M150 25C81.1 25 25 81.1 25 150C25 218.9 81.1 275 150 275C218.9 275 275 218.9 275 150C275 81.1 218.9 25 150 25ZM150 265C86.6 265 35 213.4 35 150C35 86.6 86.6 35 150 35C213.4 35 265 86.6 265 150C265 213.4 213.4 265 150 265Z" 
          fill="white"
        />
        <path 
          d="M84.5 95H135L146 125H106L84.5 95Z" 
          fill="white" 
          stroke="white"
        />
        <path 
          d="M106 125H146L157 155H117L106 125Z" 
          fill="white" 
          stroke="white"
        />
        <path 
          d="M117 155H157L167 185H127L117 155Z" 
          fill="white" 
          stroke="white"
        />
        <path 
          d="M167 95H217.5L196 125H156L167 95Z" 
          fill="white" 
          stroke="white"
        />
        <path 
          d="M156 125H196L174.5 155H134.5L156 125Z" 
          fill="white" 
          stroke="white"
        />
        <path 
          d="M134.5 155H174.5L153 185H113L134.5 155Z" 
          fill="white" 
          stroke="white"
        />
        <path 
          d="M93 200L120 200L125 210L98 210L93 200Z" 
          fill="white" 
          stroke="white"
        />
        <path 
          d="M178 200L205 200L200 210L173 210L178 200Z" 
          fill="white" 
          stroke="white"
        />
        <text x="58" y="225" fontFamily="Arial" fontSize="12" fill="white" fontWeight="bold" textAnchor="middle">MOST</text>
        <text x="240" y="225" fontFamily="Arial" fontSize="12" fill="white" fontWeight="bold" textAnchor="middle">UNKNOWN</text>
        <text x="90" y="165" fontFamily="Arial" fontSize="40" fill="white" fontWeight="bold" textAnchor="middle">3</text>
        <text x="200" y="165" fontFamily="Arial" fontSize="40" fill="white" fontWeight="bold" textAnchor="middle">6</text>
        <text x="150" y="240" fontFamily="Arial" fontSize="22" fill="white" fontWeight="bold" textAnchor="middle">KNOWN</text>
      </svg>
    </div>
  );
};

export default Logo;