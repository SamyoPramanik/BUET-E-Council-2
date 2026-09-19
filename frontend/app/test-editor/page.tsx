"use client";
import React, { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import RichTextEditor from '../../components/RichTextEditor';

function TestEditorInner() {
  const params = useSearchParams();
  const [content, setContent] = useState(params.get('empty') === '1' ? '' : '<p>Hello world</p>');
  return (
    <div style={{ padding: '20px', height: '100vh' }}>
      <RichTextEditor content={content} onChange={setContent} editable={true} />
    </div>
  );
}

export default function TestEditor() {
  return (
    <Suspense fallback={null}>
      <TestEditorInner />
    </Suspense>
  );
}
