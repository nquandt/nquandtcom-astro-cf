import { createSignal } from 'solid-js';
import { Show } from 'solid-js';

interface LoginFormProps {
	initialError?: string | null;
}

export default function LoginForm(props: LoginFormProps) {
	const [username, setUsername] = createSignal('');
	const [error, setError] = createSignal<string | null>(props.initialError || null);
	const [isLoading, setIsLoading] = createSignal(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		
		const usernameValue = username().trim();
		
		if (!usernameValue) {
			setError('Please enter a username');
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const response = await fetch('/login/github', {
				method: 'GET',
				headers: {
					'X-GitHub-Username': usernameValue,
				},
			});

			if (response.redirected) {
				window.location.href = response.url;
			} else if (response.ok) {
				const data = await response.json();
				if (data.redirectUrl) {
					window.location.href = data.redirectUrl;
				}
			} else {
				const data = await response.json();
				setError(data.error || 'An error occurred');
				setIsLoading(false);
			}
		} catch (err) {
			console.error('Login error:', err);
			setError('An error occurred. Please try again.');
			setIsLoading(false);
		}
	}

	return (
		<>
			<Show when={error()}>
				<div class="flex items-start gap-2 p-4 rounded-lg bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800">
					<p class="text-red-700 dark:text-red-400">{error()}</p>
				</div>
			</Show>

			<form onSubmit={handleSubmit} class="flex flex-col gap-4">
				<div class="flex flex-col gap-2">
					<label for="username" class="font-semibold">
						GitHub Username
					</label>
					<input
						type="text"
						id="username"
						name="username"
						required
						value={username()}
						onInput={(e) => setUsername(e.currentTarget.value)}
						placeholder="Enter your GitHub username"
						autocomplete="username"
						disabled={isLoading()}
						class="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
					/>
				</div>
				<button
					type="submit"
					disabled={isLoading()}
					class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{isLoading() ? 'Signing in...' : 'Sign in with GitHub'}
				</button>
			</form>
		</>
	);
}
