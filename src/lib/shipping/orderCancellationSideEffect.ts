export async function runOrderCancellationSideEffect(
  effect: () => Promise<void>,
  onFailure: (error: unknown) => void,
): Promise<boolean> {
  try {
    await effect();
    return true;
  } catch (error) {
    onFailure(error);
    return false;
  }
}
