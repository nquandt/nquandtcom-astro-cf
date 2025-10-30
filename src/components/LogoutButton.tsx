import { createSignal } from 'solid-js';

export default function LogoutButton() {
	const [isLoading, setIsLoading] = createSignal(false);

	async function handleLogout(e: Event) {
		e.preventDefault();
		setIsLoading(true);

		try {
			await fetch('/api/logout', {
				method: 'POST'
			});
			window.location.href = '/login';
		} catch (error) {
			console.error('Logout error:', error);
			setIsLoading(false);
		}
	}

	return (
		<form onSubmit={handleLogout}>
			<button
				type="submit"
				disabled={isLoading()}
				class="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{isLoading() ? 'Signing out...' : 'Sign out'}
			</button>
		</form>
	);
}
