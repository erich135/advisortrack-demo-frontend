export const ASSISTANT_ICON_SRC = '/brand/advisortrack-assistant.png';

export function AssistantIcon({ size, alt = '' }: { size: number; alt?: string }) {
  return (
    <img
      src={ASSISTANT_ICON_SRC}
      alt={alt}
      width={size}
      height={size}
      draggable={false}
      decoding="async"
      className="assistant-icon"
    />
  );
}
