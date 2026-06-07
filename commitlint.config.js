export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'web',
        'vitrine',
        'cms',
        'ui',
        'design-system',
        'data',
        'types',
        'utils',
        'supabase',
        'sheets',
        'infra',
        'ci',
      ],
    ],
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'ci'],
    ],
  },
}
