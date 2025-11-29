import React, { useState, useEffect } from 'react';

// --- STYLES (Injected directly to avoid file dependency issues) ---
const styles = `
/* Global Reset */
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', sans-serif; background-color: #111; color: #e5e5e5; overflow: hidden; }

/* Main Layout */
.app-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  padding: 1rem;
  gap: 1rem;
  background-color: #111;
}

/* Left Panel (Editor) */
.left-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #1e1e1e;
  border-radius: 12px;
  border: 1px solid #333;
  position: relative;
  overflow: hidden;
}

.editor-textarea {
  flex: 1;
  width: 100%;
  height: 100%;
  background-color: #0c0c0c;
  color: #f8f8f2;
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 16px;
  border: none;
  padding: 20px;
  resize: none;
  outline: none;
  line-height: 1.5;
}

.review-btn {
  position: absolute;
  bottom: 1.5rem;
  right: 1.5rem;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: white;
  padding: 0.8rem 2rem;
  font-weight: 600;
  cursor: pointer;
  border-radius: 8px;
  border: none;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
  transition: transform 0.2s;
  z-index: 10;
}
.review-btn:hover { transform: translateY(-2px); }
.review-btn:disabled { opacity: 0.7; cursor: not-allowed; }

/* Right Panel (Review) */
.right-panel {
  flex: 1;
  background-color: #262626;
  border-radius: 12px;
  padding: 2rem;
  border: 1px solid #333;
  overflow-y: auto;
  color: #d4d4d4;
  line-height: 1.6;
}

/* Custom Markdown Styles */
.md-heading {
  color: #a5b4fc;
  font-size: 1.4rem;
  margin-top: 1.5rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid #404040;
  padding-bottom: 0.5rem;
  font-weight: 600;
}
.md-subheading {
  color: #86efac;
  font-size: 1.1rem;
  margin-top: 1.2rem;
  margin-bottom: 0.8rem;
  font-weight: 600;
}
.md-paragraph { margin-bottom: 1rem; }
.md-list-item { 
  margin-bottom: 0.5rem; 
  margin-left: 1.5rem; 
  position: relative;
  list-style-type: disc; 
}
.md-list-item::marker { color: #6366f1; }
.md-code-block {
  background-color: #111;
  border: 1px solid #444;
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
  overflow-x: auto;
  font-family: 'Fira Code', monospace;
  color: #e2e8f0;
  font-size: 0.9rem;
  white-space: pre-wrap;
}
.md-inline-code {
  background-color: #3f3f46;
  color: #fca5a5;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-size: 0.9em;
  font-family: monospace;
}
.md-bold { color: #fff; font-weight: 700; }

/* Toast Notification */
.toast {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background-color: #333;
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.3);
  z-index: 100;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 8px;
  animation: fadeIn 0.3s ease;
}
@keyframes fadeIn { from { opacity: 0; transform: translate(-50%, 10px); } to { opacity: 1; transform: translate(-50%, 0); } }

/* Scrollbars */
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: #1e1e1e; }
::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #6b7280; }
`;

// --- COMPONENTS ---

// 1. Simple Markdown Renderer (No external deps)
const MarkdownRenderer = ({ content }) => {
  if (!content) return null;

  // Split content by code blocks first
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div>
      {parts.map((part, index) => {
        // Render Code Block
        if (part.startsWith('```')) {
          const codeContent = part.replace(/^```\w*\n?/, '').replace(/```$/, '');
          return <pre key={index} className="md-code-block"><code>{codeContent}</code></pre>;
        }

        // Render Text (Lines)
        return part.split('\n').map((line, lineIndex) => {
          // Headers
          if (line.startsWith('## ')) return <h2 key={`${index}-${lineIndex}`} className="md-heading">{parseInline(line.replace('## ', ''))}</h2>;
          if (line.startsWith('### ')) return <h3 key={`${index}-${lineIndex}`} className="md-subheading">{parseInline(line.replace('### ', ''))}</h3>;
          
          // List Items
          if (line.trim().startsWith('* ')) {
            return (
              <ul key={`${index}-${lineIndex}`}>
                <li className="md-list-item">{parseInline(line.replace('* ', ''))}</li>
              </ul>
            );
          }
          
          // Empty lines
          if (line.trim() === '') return <div key={`${index}-${lineIndex}`} style={{ height: '8px' }}></div>;

          // Paragraphs
          return <p key={`${index}-${lineIndex}`} className="md-paragraph">{parseInline(line)}</p>;
        });
      })}
    </div>
  );
};

// Helper to parse bold and inline code
const parseInline = (text) => {
  if (!text) return null;
  // This is a basic parser. It splits by `**` for bold and ` ` for code.
  // Note: A full parser is complex; this handles the prompt's specific output format.
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="md-bold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="md-inline-code">{part.slice(1, -1)}</code>;
    }
    return part;
  });
};


// --- MAIN APP ---
function App() {
  const [code, setCode] = useState(`function sum() {
  return 1 + 1
}`);
  
  const [review, setReview] = useState(`🟢THIS THE REVIEW PLACEHOLDER.
    THIS TEXT WILL BE REPLACED WHEN THE CODE IS EXECUTED WITH A RUNNING BACKEND
`);

  const [isLoading, setIsLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  async function reviewCode() {
    setIsLoading(true);
    showToast("Reviewing your code...");

    try {
      // Using fetch instead of axios
      const response = await fetch('http://localhost:3000/ai/get-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      if (!response.ok) throw new Error("Failed to fetch");

      const data = await response.text(); // Assuming backend returns raw text/markdown
      setReview(data);
      showToast("Review completed!");
    } catch (error) {
      console.error(error);
      // Fallback for demo purposes if localhost isn't running
      showToast("Review failed (Check console)");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <style>{styles}</style>
      
      {toastMsg && <div className="toast">ℹ️ {toastMsg}</div>}

      <div className="app-container">
        {/* Left Panel: Input */}
        <div className="left-panel">
          <textarea 
            className="editor-textarea"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck="false"
          />
          <button 
            onClick={reviewCode} 
            disabled={isLoading} 
            className="review-btn"
          >
            {isLoading ? "Reviewing..." : "Review Code"}
          </button>
        </div>

        {/* Right Panel: Output */}
        <div className="right-panel">
          <MarkdownRenderer content={review} />
        </div>
      </div>
    </>
  );
}

export default App;