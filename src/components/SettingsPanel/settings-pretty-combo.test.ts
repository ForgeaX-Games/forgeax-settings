import { describe, expect, it } from 'bun:test';
import { comboDisplayParts } from './combo-display-parts';

describe('comboDisplayParts', () => {
  it('splits mac modifiers into separate Command/Shift labels', () => {
    expect(comboDisplayParts('Ctrl+Shift+F', 'mac')).toEqual(['Command', 'Shift', 'F']);
  });

  it('splits windows modifiers into separate key labels', () => {
    expect(comboDisplayParts('Ctrl+Shift+F', 'windows')).toEqual(['Ctrl', 'Shift', 'F']);
  });

  it('keeps single keys as one part', () => {
    expect(comboDisplayParts('F1', 'mac')).toEqual(['F1']);
    expect(comboDisplayParts('Esc', 'windows')).toEqual(['Esc']);
  });
});
