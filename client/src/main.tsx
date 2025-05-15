import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add meta description tag
const metaDescription = document.createElement('meta');
metaDescription.name = 'description';
metaDescription.content = 'Civcon Office - Procurement management system for construction projects with requisition tracking, supplier management, and purchase orders.';
document.head.appendChild(metaDescription);

// Add title
const titleTag = document.createElement('title');
titleTag.textContent = 'Civcon Office - Procurement Management';
document.head.appendChild(titleTag);

// Add Open Graph tags
const ogTitle = document.createElement('meta');
ogTitle.setAttribute('property', 'og:title');
ogTitle.content = 'Civcon Office - Procurement Management';
document.head.appendChild(ogTitle);

const ogDescription = document.createElement('meta');
ogDescription.setAttribute('property', 'og:description');
ogDescription.content = 'Streamlined procurement system for construction companies to manage projects, suppliers, requisitions and purchase orders.';
document.head.appendChild(ogDescription);

const ogType = document.createElement('meta');
ogType.setAttribute('property', 'og:type');
ogType.content = 'website';
document.head.appendChild(ogType);

createRoot(document.getElementById("root")!).render(<App />);
