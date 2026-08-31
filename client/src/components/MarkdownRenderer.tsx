import React, { useState, useMemo } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import { Copy, Check, Terminal, ExternalLink } from 'lucide-react';
import { sound } from '../lib/sound';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  isStreaming?: boolean;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = '',
  isStreaming = false,
}) => {
  // Pre-process markdown and extract code blocks with copy action
  const renderedElements = useMemo(() => {
    if (!content) return [];

    // Strip chain of thought (<thought>...</thought>, <think>...</think>)
    const sanitized = content
      .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/<thought>[\s\S]*$/gi, '')
      .replace(/<think>[\s\S]*$/gi, '')
      .trim();

    if (!sanitized) return [];

    // Parse tokens with marked
    const tokens = marked.lexer(sanitized);
    return tokens;
  }, [content]);

  return (
    <div className={`markdown-content space-y-3 font-sans text-xs md:text-sm text-[#dae2fd] leading-relaxed break-words ${className}`}>
      {renderedElements.map((token, index) => (
        <TokenRenderer key={`${token.type}-${index}`} token={token} />
      ))}
      {isStreaming && (
        <span className="inline-block w-2 h-4 ml-1 bg-[#00ffab] animate-pulse align-middle" />
      )}
    </div>
  );
};

interface TokenRendererProps {
  token: any;
}

const TokenRenderer: React.FC<TokenRendererProps> = ({ token }) => {
  switch (token.type) {
    case 'heading': {
      const depth = Math.min(Math.max(token.depth, 1), 6);
      const headingStyles: Record<number, string> = {
        1: 'text-lg md:text-xl font-bold font-display text-[#00ffab] border-b border-[#222a3d] pb-2 mt-4 mb-2 flex items-center gap-2',
        2: 'text-base md:text-lg font-bold font-display text-[#00e5ff] mt-3 mb-1.5 flex items-center gap-2',
        3: 'text-sm md:text-base font-semibold font-display text-[#dae2fd] mt-2.5 mb-1',
        4: 'text-xs md:text-sm font-semibold text-[#bbcabf] mt-2 mb-1',
        5: 'text-xs font-semibold text-[#86948a] mt-1.5 mb-0.5',
        6: 'text-xs font-semibold text-[#86948a] mt-1 mb-0.5',
      };
      const className = headingStyles[depth] || headingStyles[3];
      if (depth === 1) return <h1 className={className}><InlineContent text={token.text} /></h1>;
      if (depth === 2) return <h2 className={className}><InlineContent text={token.text} /></h2>;
      if (depth === 3) return <h3 className={className}><InlineContent text={token.text} /></h3>;
      if (depth === 4) return <h4 className={className}><InlineContent text={token.text} /></h4>;
      if (depth === 5) return <h5 className={className}><InlineContent text={token.text} /></h5>;
      return <h6 className={className}><InlineContent text={token.text} /></h6>;
    }

    case 'paragraph': {
      return (
        <p className="leading-relaxed text-[#dae2fd]/90 my-1.5">
          <InlineContent text={token.text} />
        </p>
      );
    }

    case 'code': {
      return <CodeBlock code={token.text} language={token.lang} />;
    }

    case 'list': {
      if (token.ordered) {
        return (
          <ol className="list-decimal list-outside pl-5 space-y-1.5 my-2 text-[#dae2fd]">
            {token.items.map((item: any, i: number) => (
              <li key={i} className="pl-1 marker:text-[#00ffab] marker:font-mono marker:text-xs">
                <InlineContent text={item.text} />
              </li>
            ))}
          </ol>
        );
      } else {
        return (
          <ul className="list-none space-y-1.5 my-2 pl-1">
            {token.items.map((item: any, i: number) => {
              const isTask = item.task;
              const checked = item.checked;
              return (
                <li key={i} className="flex items-start gap-2.5 text-[#dae2fd]">
                  {isTask ? (
                    <span
                      className={`inline-flex items-center justify-center w-4 h-4 rounded mt-0.5 flex-shrink-0 text-[10px] ${
                        checked
                          ? 'bg-[#00ffab] text-[#003824] font-bold'
                          : 'bg-[#131b2e] border border-[#222a3d] text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00ffab] mt-2 flex-shrink-0 shadow-[0_0_6px_#00ffab]" />
                  )}
                  <div className="flex-1">
                    <InlineContent text={item.text} />
                  </div>
                </li>
              );
            })}
          </ul>
        );
      }
    }

    case 'blockquote': {
      return (
        <blockquote className="border-l-2 border-[#00ffab] bg-[#131b2e]/60 pl-3.5 pr-3 py-2 my-2 rounded-r-xl text-[#bbcabf] italic font-sans">
          <div className="space-y-1">
            {token.tokens?.map((subToken: any, idx: number) => (
              <TokenRenderer key={idx} token={subToken} />
            )) || <InlineContent text={token.text} />}
          </div>
        </blockquote>
      );
    }

    case 'table': {
      return (
        <div className="my-3 overflow-x-auto rounded-xl border border-[#222a3d] bg-[#0d1628]/80 shadow-md">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#131b2e] border-b border-[#222a3d]">
                {token.header.map((headerCell: any, hIdx: number) => (
                  <th
                    key={hIdx}
                    className="py-2.5 px-3 font-mono font-semibold text-[#00ffab] uppercase text-[11px] tracking-wider"
                  >
                    <InlineContent text={headerCell.text} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222a3d]/50">
              {token.rows.map((row: any[], rIdx: number) => (
                <tr
                  key={rIdx}
                  className="hover:bg-[#171f33]/40 transition-colors"
                >
                  {row.map((cell: any, cIdx: number) => (
                    <td key={cIdx} className="py-2 px-3 text-[#dae2fd]">
                      <InlineContent text={cell.text} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case 'hr': {
      return <hr className="border-[#222a3d] my-4" />;
    }

    case 'space': {
      return null;
    }

    default: {
      if (token.text) {
        return <InlineContent text={token.text} />;
      }
      return null;
    }
  }
};

/**
 * Dedicated Code Block with Syntax Highlighting & Copy code button
 */
interface CodeBlockProps {
  code: string;
  language?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const cleanLang = (language || '').trim().toLowerCase();

  const highlighted = useMemo(() => {
    if (!code) return '';
    try {
      if (cleanLang && hljs.getLanguage(cleanLang)) {
        return hljs.highlight(code, { language: cleanLang }).value;
      }
      return hljs.highlightAuto(code).value;
    } catch {
      return escapeHtml(code);
    }
  }, [code, cleanLang]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    sound.playClick();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-[#222a3d] bg-[#060d1d] shadow-lg text-xs font-mono">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#0e162a] border-b border-[#222a3d]/70 text-[#86948a]">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-[#00ffab]" />
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#bbcabf]">
            {cleanLang || 'code'}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-[#17223b] text-[11px] text-[#bbcabf] hover:text-[#00ffab] transition-all"
          title="Скопировать код"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-[#00ffab]" />
              <span className="text-[#00ffab] font-medium">Скопировано!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Копировать</span>
            </>
          )}
        </button>
      </div>

      {/* Code Body */}
      <pre className="p-3.5 overflow-x-auto text-[11.5px] leading-relaxed custom-scrollbar text-[#dae2fd]">
        <code
          dangerouslySetInnerHTML={{ __html: highlighted }}
          className={`hljs ${cleanLang ? `language-${cleanLang}` : ''}`}
        />
      </pre>
    </div>
  );
};

/**
 * Helper to render inline markdown styles: bold, italic, inline code, links, strikethrough
 */
const InlineContent: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  // Convert inline markdown to HTML safely with marked.parseInline
  const html = useMemo(() => {
    try {
      return marked.parseInline(text) as string;
    } catch {
      return escapeHtml(text);
    }
  }, [text]);

  return (
    <span
      dangerouslySetInnerHTML={{ __html: html }}
      className="inline-markdown"
    />
  );
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
