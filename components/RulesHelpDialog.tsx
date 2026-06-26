'use client';

import { Badge, Button, Group, Stack } from '@doneisbetter/gds';
import { RULES_HELP_TOPICS, deriveContextualHint, type RulesHelpTopicId } from '@/lib/game/rules-help';
import type { GameSnapshot } from '@/lib/shared/types';

type Props = {
  open: boolean;
  topicId: RulesHelpTopicId;
  snapshot?: GameSnapshot | null;
  onTopicChange: (topicId: RulesHelpTopicId) => void;
  onClose: () => void;
  onReplayTutorial?: () => void;
};

export function RulesHelpDialog({ open, topicId, snapshot, onTopicChange, onClose, onReplayTutorial }: Props) {
  if (!open) return null;
  const topic = RULES_HELP_TOPICS.find((item) => item.topicId === topicId) ?? RULES_HELP_TOPICS[0];
  const hint = deriveContextualHint(snapshot);
  return (
    <div className="help-backdrop" role="presentation">
      <section className="help-dialog" role="dialog" aria-modal="true" aria-labelledby="rules-help-title" aria-describedby="rules-help-summary">
        <Stack gap="sm">
          <Group justify="space-between" align="center">
            <Badge color={hint.severity === 'blocked' ? 'red' : hint.severity === 'warning' ? 'orange' : 'blue'} variant="light">{hint.severity}</Badge>
            <Button size="xs" variant="light" onClick={onClose}>Close</Button>
          </Group>
          <div className="list-card help-hint" role="status" aria-live="polite">
            <strong>{hint.title}</strong>
            <p className="copy">{hint.body}</p>
          </div>
          <h2 id="rules-help-title">{topic.title}</h2>
          <p id="rules-help-summary" className="copy">{topic.summary}</p>
          <ul className="help-list">
            {topic.bullets.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <div className="topic-grid" role="group" aria-label="Rule topics">
            {RULES_HELP_TOPICS.map((item) => (
              <button key={item.topicId} className={item.topicId === topic.topicId ? 'active' : ''} type="button" onClick={() => onTopicChange(item.topicId)} aria-pressed={item.topicId === topic.topicId}>
                {item.title}
              </button>
            ))}
          </div>
          {onReplayTutorial ? <Button variant="light" onClick={onReplayTutorial}>Replay tutorial</Button> : null}
        </Stack>
      </section>
    </div>
  );
}
