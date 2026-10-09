import { CharacterLook, DEFAULT_P1 } from './characters';

/** Personagens secundários (gerados com o mesmo gerador de sprites dos protagonistas). */
const base: CharacterLook = { ...DEFAULT_P1, beard: 'nenhuma', tattoo: 'nenhuma', sleeves: 'longas', accessory: 'nenhum', lashes: false, highlights: '' };

export const NPCS: Record<string, CharacterLook> = {
  garcom: { ...base, name: 'Garçom', skin: '#e8b48f', eyes: '#3a2a1e', hair: '#1c1414', hairStyle: 'curto', beard: 'rala', beardColor: '#1c1414', shirt: '#f0f0f0', pants: '#2a2a2a', shoes: '#1c1c24', accessory: 'nenhum' },
  pai: { ...base, name: 'Pai do João', skin: '#eec0a0', hair: '#b8b0a8', hairStyle: 'curto', eyes: '#3f8ad8', beard: 'rala', beardColor: '#b8b0a8', shirt: '#4fa35a', pants: '#3b3f5c', glasses: true },
  mae: { ...base, name: 'Mãe do João', skin: '#f0c8a8', hair: '#8a5a34', hairStyle: 'coque', eyes: '#3a2a1e', shirt: '#e76f51', pants: '#3b3f5c', lashes: true, accessory: 'brinco', accessoryColor: '#ffd25e', build: 'medio' },
  caipira: { ...base, name: 'Dançarino', skin: '#d9a07a', hair: '#3b2a20', hairStyle: 'curto', shirt: '#d64545', pants: '#3f5a8a', accessory: 'chapeu', accessoryColor: '#e9c46a', beard: 'rala', beardColor: '#3b2a20' },
  caipira2: { ...base, name: 'Dançarina', skin: '#e8b48f', hair: '#5a3a24', hairStyle: 'rabo', shirt: '#ff8fb1', pants: '#ff8fb1', accessory: 'chapeu', accessoryColor: '#e9c46a', lashes: true, build: 'magro' },
};
