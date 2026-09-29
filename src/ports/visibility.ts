/** Whether the app is on screen. The lock uses it to lock after time in the background. */
export interface Visibility {
  isVisible(): boolean;
  subscribe(listener: (visible: boolean) => void): () => void;
}
