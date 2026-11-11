import React, { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { java } from '@codemirror/lang-java';

// CodeMirror rather than Monaco (VS Code's editor): it is much smaller and it
// works with a phone keyboard.
const CodeEditor = ({ value, onChange, language, height = '320px' }) => {
  const extensions = useMemo(() => [language === 'java' ? java() : javascript()], [language]);

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={extensions}
      height={height}
      basicSetup={{ foldGutter: false, highlightActiveLineGutter: true, autocompletion: true }}
      className="text-[13px] [&_.cm-editor]:outline-none [&_.cm-gutters]:bg-stone-50 [&_.cm-gutters]:border-stone-200"
    />
  );
};

export default CodeEditor;
