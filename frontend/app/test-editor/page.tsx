"use client";
import React, { useState } from 'react';
import RichTextEditor from '../../components/RichTextEditor';

export default function TestEditor() {
  const [content, setContent] = useState('<p>Hello world</p>');
  return (
    <div style={{ padding: '20px', height: '100vh' }}>
      <RichTextEditor content={content} onChange={setContent} editable={true} />
    </div>
  );
}
