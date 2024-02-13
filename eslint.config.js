import globals from 'globals';
import config from 'eslint-config-qubyte';

export default [
  config,
  {
    files: ['**/*.js'],
    languageOptions: { globals: globals.nodeBuiltin }
  }
];
