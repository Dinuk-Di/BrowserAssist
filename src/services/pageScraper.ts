import { Readability } from '@mozilla/readability';

export const getPageContext = (): string => {
  const MAX_CHARS = 15000;

  // 1. Check if Gmail (special handling for thread history)
  if (window.location.hostname.includes('mail.google.com')) {
    const openedEmails = document.querySelectorAll('.a3s.aiL');
    if (openedEmails && openedEmails.length > 0) {
      let combinedText = '';
      openedEmails.forEach((emailNode) => {
        combinedText += (emailNode as HTMLElement).innerText + '\n\n';
      });
      console.log("Email Context:", combinedText);
      return "Email Thread Context:\n" + combinedText.substring(0, MAX_CHARS);
    }
  }

  // Helper to extract clean innerText
  const extractCleanText = () => {
    const clone = document.body.cloneNode(true) as HTMLElement;
    const scripts = clone.querySelectorAll('script, style, nav, footer, header, noscript, iframe');
    scripts.forEach(s => s.remove());
    
    // Replace multiple newlines and spaces
    let text = clone.textContent || '';
    // Basic cleanup of excessive whitespace from textContent
    text = text.replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n\n');
    console.log("Clean Text:", text);
    return text.trim().substring(0, MAX_CHARS);
  };

  // 2. Generic Page: Use Readability to extract main article text
  try {
    const documentClone = document.cloneNode(true) as Document;
    const article = new Readability(documentClone).parse();
    if (article && article.textContent && article.textContent.trim().length > 200) {
      console.log("Normal Page:", article);
      return article.textContent.trim().substring(0, MAX_CHARS);
    } else {
       return extractCleanText();
    }
  } catch (err) {
    return extractCleanText();
  }
};
