import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'

const eslintConfig = [
	{
		ignores: ['.next/**', 'node_modules/**', 'public/**', 'docs/**'],
	},
	...nextCoreWebVitals,
	{
		// New React-Compiler-derived rules (react-hooks v7) flag real smells in the
		// legacy Pages Router components. Those components are replaced by the ocean
		// rebuild — keep the signals visible as warnings without blocking CI.
		rules: {
			'react-hooks/set-state-in-effect': 'warn',
			'react-hooks/immutability': 'warn',
			'react-hooks/static-components': 'warn',
			'react-hooks/refs': 'warn',
		},
	},
]

export default eslintConfig
