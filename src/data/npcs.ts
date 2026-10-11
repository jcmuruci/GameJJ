import { CharacterLook, DEFAULT_P1 } from './characters';

/** Personagens secundários (gerados com o mesmo gerador de sprites dos protagonistas). */
const base: CharacterLook = { ...DEFAULT_P1, beard: 'nenhuma', tattoo: 'nenhuma', sleeves: 'longas', accessory: 'nenhum', lashes: false, highlights: '' };

export const NPCS: Record<string, CharacterLook> = {
  garcom: { ...base, name: 'Garçom', skin: '#e8b48f', eyes: '#3a2a1e', hair: '#1c1414', hairStyle: 'curto', beard: 'rala', beardColor: '#1c1414', shirt: '#f0f0f0', pants: '#2a2a2a', shoes: '#1c1c24', accessory: 'nenhum' },
  // os pais do João (68 anos): ele grisalho, de olhos azuis, sem barba e sem óculos; ela de cabelo curto castanho-claro e óculos
  pai: { ...base, name: 'Pai do João', skin: '#eec0a0', hair: '#c8c4be', hairStyle: 'curto', eyes: '#3f8ad8', beard: 'nenhuma', beardColor: '#c8c4be', shirt: '#4fa35a', pants: '#3b3f5c', glasses: false, age: 68 },
  mae: { ...base, name: 'Mãe do João', skin: '#f0c8a8', hair: '#b08a5e', hairStyle: 'curto', eyes: '#3a2a1e', shirt: '#e76f51', pants: '#3b3f5c', lashes: true, glasses: true, accessory: 'brinco', accessoryColor: '#ffd25e', build: 'medio', age: 68 },
  caipira: { ...base, name: 'Dançarino', skin: '#d9a07a', hair: '#3b2a20', hairStyle: 'curto', shirt: '#d64545', pants: '#3f5a8a', accessory: 'chapeu', accessoryColor: '#e9c46a', beard: 'rala', beardColor: '#3b2a20' },
  caipira2: { ...base, name: 'Dançarina', skin: '#e8b48f', hair: '#5a3a24', hairStyle: 'rabo', shirt: '#ff8fb1', pants: '#ff8fb1', accessory: 'chapeu', accessoryColor: '#e9c46a', lashes: true, build: 'magro' },
  vendedora: { ...base, name: 'Vendedora', skin: '#e8b48f', hair: '#2a1a14', hairStyle: 'coque', eyes: '#3a2a1e', shirt: '#6c9cff', pants: '#3b3f5c', lashes: true, build: 'medio' },
  padre: { ...base, name: 'Padre', skin: '#f0c8a8', hair: '#d8d0c8', hairStyle: 'curto', eyes: '#3a2a1e', shirt: '#2a2a34', pants: '#2a2a34' },
  motoboy: { ...base, name: 'Motoboy', skin: '#d9a07a', hair: '#2a1a14', hairStyle: 'curto', eyes: '#3a2a1e', shirt: '#e8742a', pants: '#2a2a3a', accessory: 'bone', accessoryColor: '#e8424a' },
  porteiro: { ...base, name: 'Porteiro', skin: '#c88a5a', hair: '#1c1414', hairStyle: 'raspado', eyes: '#3a2a1e', shirt: '#3f7fd6', pants: '#2a2a3a', beard: 'rala', beardColor: '#1c1414' },
};
