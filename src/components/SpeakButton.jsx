import { canSpeak, speak } from '../lib/speech.js';
import { SpeakerIcon } from './Icons.jsx';

export default function SpeakButton({ text, size = 'sm', className = '' }) {
  if (!canSpeak || !text) return null;
  const large = size === 'lg';
  return (
    <button
      type="button"
      title={`Озвучить: ${text}`}
      aria-label={`Озвучить ${text}`}
      onClick={(e) => {
        e.stopPropagation();
        speak(text);
      }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-subtle text-muted transition hover:bg-gold-soft hover:text-gold active:scale-95 ${
        large ? 'h-9 w-9' : 'h-6 w-6'
      } ${className}`}
    >
      <SpeakerIcon size={large ? 18 : 13} />
    </button>
  );
}
