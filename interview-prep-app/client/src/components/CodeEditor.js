import React, { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { java } from '@codemirror/lang-java';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';

const MODES = { javascript, java, python, cpp };

// CodeMirror rather than Monaco (VS Code's editor): it is much smaller and it
// works with a phone keyboard.
// dark: CodeMirror's built-in "One Dark" theme instead of the light one.
const CodeEditor = ({ value, onChange, language, height = '320px', dark = false }) => {
  const extensions = useMemo(() => [(MODES[language] || javascript)()], [language]);

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={extensions}
      height={height}
      theme={dark ? 'dark' : 'light'}
      basicSetup={{ foldGutter: false, highlightActiveLineGutter: true, autocompletion: true }}
      // 16px on phones: iPhone Safari zooms the whole page when you tap into
      // text smaller than that. The light gutter colours only apply in light mode.
      className={`text-[16px] sm:text-[13px] [&_.cm-editor]:outline-none ${dark ? '' : '[&_.cm-gutters]:bg-stone-50 [&_.cm-gutters]:border-stone-200'}`}
    />
  );
};

export default CodeEditor;
