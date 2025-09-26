'use client';

import { useEffect, useState } from 'react';
import type { HumanActionRequest, SubmitHumanActionPayload } from '@/lib/game/types';

interface ActionPanelProps {
  request: HumanActionRequest;
  onSubmit: (payload: SubmitHumanActionPayload) => void;
}

export function ActionPanel({ request, onSubmit }: ActionPanelProps) {
  const [selected, setSelected] = useState<string | undefined>();
  const [text, setText] = useState('');

  useEffect(() => {
    setSelected(undefined);
    setText('');
  }, [request.requestId]);

  const handleSubmit = () => {
    onSubmit({ requestId: request.requestId, chosenOptionId: selected, text });
    setSelected(undefined);
    setText('');
  };

  const requiresChoice = request.options.length > 0;
  const requiresText = Boolean(request.extraInput);

  const isDisabled =
    (requiresChoice && !selected) ||
    (requiresText && !text.trim());

  return (
    <section className="action-panel" aria-live="polite">
      <div>
        <h3 style={{ margin: '0 0 6px' }}>{request.title}</h3>
        <p className="muted" style={{ margin: 0 }}>
          {request.description}
        </p>
      </div>

      {requiresChoice && (
        <div className="action-options">
          {request.options.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`secondary-button ${selected === option.id ? 'active' : ''}`}
              onClick={() => setSelected(option.id)}
              disabled={option.disabled}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {requiresText && (
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={request.extraInput?.placeholder}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="primary-button" disabled={isDisabled} onClick={handleSubmit}>
          確認送出
        </button>
      </div>
    </section>
  );
}
