import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSave, FaRotateCw, FaEye, FaCode, FaFile, FaFolder, FaSearch, FaChevronDown, FaChevronRight, FaGithub, FaRocket, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { clsx } from 'clsx';
import { buttonClass } from '../ui';
import { useReducedMotion, motionVariants, getMotionProps } from '../../lib/motion';

const CODE_API = '/api/admin/code';

const ALLOWED_DIRS = ['src/components', 'src/routes', 'src/lib', 'src/hooks', 'src/components/ui'];
const BLOCKED_DIRS = ['worker', 'playwright', '.git', 'node_modules', 'dist', '.superpowers'];

function FileTree({ files, selectedFile, onSelect, expandedFolders, onToggleFolder }) {
  const renderTree = (items, depth = 0) => {
    return (
      <div className={clsx('space-y-1', depth > 0 && 'pl-4')}>
        {items.map(item => {
          const isFolder = item.type === 'folder';
          const isExpanded = expandedFolders.has(item.path);
          const fullPath = item.path;

          if (isFolder) {
            return (
              <div key={item.path}>
                <div
                  className={clsx('flex items-center gap-1.5 py-1 px-2 rounded hover:bg-white/5 cursor-pointer', depth === 0 && 'font-medium')}
                  onClick={() => onToggleFolder(fullPath)}
                >
                  <FaChevronRight className={clsx('text-xs text-zinc-500 transition-transform', isExpanded && 'rotate-90')} />
                  <FaFolder className="text-sm text-brand" />
                  <span className="text-sm text-zinc-300">{item.name}</span>
                </div>
                {isExpanded && <div>{renderTree(item.children, depth + 1)}</div>}
              </div>
            );
          }

          return (
            <div
              key={item.path}
              className={clsx(
                'flex items-center gap-2 py-1 px-2 rounded hover:bg-white/5 cursor-pointer',
                selectedFile === fullPath && 'bg-brand/10 text-brand'
              )}
              onClick={() => onSelect(fullPath)}
            >
              <FaFile className="text-xs text-zinc-500" />
              <span className="text-sm text-zinc-300 truncate">{item.name}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return <div className="space-y-1">{renderTree(files)}</div>;
}

function MonacoEditor({ filePath, content, onChange, language }) {
  const editorRef = useRef(null);
  const [monaco, setMonaco] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && !monaco) {
      import('monaco-editor').then(m => {
        setMonaco(m);
        const editor = m.editor.create(editorRef.current, {
          value: content,
          language: language || 'javascript',
          theme: 'vs-dark',
          automaticLayout: true,
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          tabSize: 2,
          wordWrap: 'on',
        });
        editor.onDidChangeModelContent(() => {
          onChange(editor.getValue());
        });
      });
    }
  }, [monaco]);

  useEffect(() => {
    if (monaco && editorRef.current) {
      const editor = monaco.editor.getModels()[0];
      if (editor && editor.getValue() !== content) {
        editor.setValue(content);
      }
    }
  }, [content, monaco]);

  return <div ref={editorRef} className="h-full min-h-[400px]" />;
}

function CodeDiff({ oldContent, newContent }) {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  const maxLines = Math.max(oldLines.length, newLines.length);

  return (
    <div className="font-mono text-sm space-y-1 max-h-96 overflow-auto">
      {Array.from({ length: maxLines }, (_, i) => {
        const oldLine = oldLines[i];
        const newLine = newLines[i];
        const isRemoved = oldLine !== undefined && oldLine !== newLine;
        const isAdded = newLine !== undefined && oldLine !== newLine;
        const isSame = oldLine === newLine;

        if (isSame) {
          return <div key={i} className="text-zinc-500">{i + 1}: {oldLine}</div>;
        }

        return (
          <div key={i} className="flex gap-2">
            <span className="w-8 text-right text-zinc-600">{oldLine !== undefined ? i + 1 : ''}</span>
            {oldLine !== undefined && isRemoved && (
              <div className="flex-1 bg-red-500/20 text-red-300 px-2">- {oldLine}</div>
            )}
            {oldLine === undefined && <div className="flex-1 px-2" />}
            <span className="w-8 text-right text-zinc-600">{newLine !== undefined ? i + 1 : ''}</span>
            {newLine !== undefined && isAdded && (
              <div className="flex-1 bg-emerald-500/20 text-emerald-300 px-2">+ {newLine}</div>
            )}
            {newLine === undefined && <div className="flex-1 px-2" />}
          </div>
        );
      })}
    </div>
  );
}

export default function CodeEditor() {
  const prefersReduced = useReducedMotion();
  const [fileTree, setFileTree] = useState({ type: 'folder', name: 'src', path: 'src', children: [] });
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showDiff, setShowDiff] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState(new Set(['src', 'src/components', 'src/routes', 'src/lib', 'src/components/ui', 'src/hooks']));
  const [monaco, setMonaco] = useState(null);

  useEffect(() => {
    loadFileTree();
  }, []);

  const loadFileTree = async () => {
    try {
      const res = await fetch(`${CODE_API}/tree`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setFileTree(data.tree);
    } catch (e) {
      console.error('Failed to load file tree:', e);
    }
  };

  const loadFile = async (path) => {
    setSelectedFile(path);
    setLoading(true);
    try {
      const res = await fetch(`${CODE_API}/file?path=${encodeURIComponent(path)}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        setFileContent(data.content);
        setOriginalContent(data.content);
      }
    } catch (e) {
      console.error('Failed to load file:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedFile) return;
    setSaving(true);
    try {
      const res = await fetch(`${CODE_API}/file`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: selectedFile, content: fileContent }),
      });
      const data = await res.json();
      if (data.ok) {
        setOriginalContent(fileContent);
        alert('Saved!');
      } else {
        alert('Save failed: ' + data.error);
      }
    } catch (e) {
      alert('Save failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    if (!selectedFile) return;
    setLoading(true);
    try {
      const res = await fetch(`${CODE_API}/preview`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: selectedFile, content: fileContent }),
      });
      const data = await res.json();
      if (data.ok && data.previewUrl) {
        setPreviewUrl(data.previewUrl);
        window.open(data.previewUrl, '_blank');
      } else {
        alert('Preview failed: ' + data.error);
      }
    } catch (e) {
      alert('Preview failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!selectedFile) return;
    if (!confirm('Create a PR with these changes?')) return;
    setLoading(true);
    try {
      const res = await fetch(`${CODE_API}/commit`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: selectedFile, content: fileContent, message: `Update ${selectedFile}` }),
      });
      const data = await res.json();
      if (data.ok && data.prUrl) {
        window.open(data.prUrl, '_blank');
      } else {
        alert('Commit failed: ' + data.error);
      }
    } catch (e) {
      alert('Commit failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const getLanguage = (path) => {
    const ext = path.split('.').pop();
    const map = { js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', css: 'css', json: 'json', md: 'markdown', html: 'html' };
    return map[ext] || 'plaintext';
  };

  const currentFile = selectedFile ? fileTree?.children?.find(f => f.path === selectedFile) : null;

  return (
    <div className="h-full flex flex-col bg-night">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-3 border-b border-white/10 bg-charcoal/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FaCode className="text-brand" />
          <span className="font-medium text-white">Code Editor</span>
          {selectedFile && (
            <span className="text-xs text-zinc-500 px-2 py-0.5 rounded bg-charcoal/50">{selectedFile}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowDiff(true)} className="btn btn-outline text-sm">
            Diff
          </button>
          <button onClick={loadFileTree} disabled={loading} className="btn btn-outline text-sm">
            <FaRotateCw className="text-sm" />
            Refresh
          </button>
          <button onClick={() => setShowDiff(true)} className="btn btn-outline text-sm" disabled={!originalContent || originalContent === fileContent}>
            <FaCode className="text-sm" />
            Show Diff
          </button>
          <button onClick={handleSave} disabled={saving || loading || !selectedFile || originalContent === fileContent} className="btn btn-primary text-sm">
            <FaSave className="text-sm" />
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={handlePreview} disabled={loading || !selectedFile} className="btn btn-outline text-sm">
            <FaEye className="text-sm" />
            Preview
          </button>
          <button onClick={handleCommit} disabled={loading || !selectedFile || originalContent === fileContent} className="btn btn-outline text-sm">
            <FaGithub className="text-sm" />
            Commit & PR
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 sm:w-72 border-r border-white/10 bg-charcoal/50 overflow-y-auto p-3 flex-shrink-0">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider">
            <FaFolder className="text-brand" />
            Project Files
          </div>
          <div className="space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto">
            <FileTree
              files={fileTree.children || []}
              selectedFile={selectedFile}
              onSelect={loadFile}
              expandedFolders={expandedFolders}
              onToggleFolder={(path) => {
                const newSet = new Set(expandedFolders);
                if (newSet.has(path)) newSet.delete(path);
                else newSet.add(path);
                setExpandedFolders(newSet);
              }}
            />
          </div>
        </div>

        {/* Main Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedFile ? (
            <div className="flex-1 flex flex-col relative">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-charcoal/30 text-xs text-zinc-400">
                <FaFile className="text-brand" />
                <span className="truncate">{selectedFile}</span>
                {fileContent !== originalContent && <span className="ml-2 text-amber-400">● Unsaved</span>}
              </div>
              <div className="flex-1 relative">
                {showDiff && originalContent !== fileContent ? (
                  <div className="h-full p-3">
                    <CodeDiff oldContent={originalContent} newContent={fileContent} />
                  </div>
                ) : (
                  <MonacoEditor
                    filePath={selectedFile}
                    content={fileContent}
                    onChange={setFileContent}
                    language={getLanguage(selectedFile)}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-500">
              <div className="text-center">
                <FaCode className="text-6xl text-brand/20 mb-4" />
                <p className="text-zinc-400">Select a file to start editing</p>
                <p className="text-xs text-zinc-600 mt-2">Allowed: src/components, src/routes, src/lib, src/hooks, src/index.css</p>
              </div>
            </div>
            )}
        </div>
      </div>
    </div>
  );
}
