import { createSignal, createResource, For, Show, onMount } from 'solid-js';

interface User {
	id: string;
	email: string;
	username: string;
	role: 'admin' | 'editor' | 'reader';
	authSource: string;
	isActive: boolean;
	githubId?: number;
	createdAt: string;
	updatedAt: string;
}

export default function UserManagement() {
	const fetchUsers = async (): Promise<User[]> => {
		const response = await fetch('/api/admin/users');
		if (!response.ok) {
			throw new Error('Failed to load users');
		}
		return response.json();
	};
	
	const [users, { refetch }] = createResource(fetchUsers);	
	const [showAddForm, setShowAddForm] = createSignal(false);
	const [formData, setFormData] = createSignal({
		username: '',
		email: '',
		role: 'reader' as User['role'],
		authSource: 'github'
	});
	const [formMessage, setFormMessage] = createSignal<{ text: string; type: 'success' | 'error' } | null>(null);

	async function updateUserRole(userId: string, role: string) {
		try {
			const response = await fetch('/api/admin/users/update-role', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId, role })
			});

			if (!response.ok) {
				throw new Error('Failed to update role');
			}

			await refetch();
		} catch (error) {
			console.error('Error updating role:', error);
			alert('Failed to update user role');
		}
	}

	async function toggleUserActive(userId: string, isActive: boolean) {
		try {
			const response = await fetch('/api/admin/users/toggle-active', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId, isActive })
			});

			if (!response.ok) {
				throw new Error('Failed to update user status');
			}

			await refetch();
		} catch (error) {
			console.error('Error toggling active status:', error);
			alert('Failed to update user status');
		}
	}

	async function deleteUser(userId: string, username: string) {
		if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
			return;
		}

		try {
			const response = await fetch('/api/admin/users/delete', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId })
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to delete user');
			}

			await refetch();
		} catch (error) {
			console.error('Error deleting user:', error);
			alert(error instanceof Error ? error.message : 'Failed to delete user');
		}
	}

	async function createUser(e: Event) {
		e.preventDefault();
		const { username, email, role, authSource } = formData();

		if (!username || !email) {
			setFormMessage({ text: 'Please fill in all fields', type: 'error' });
			return;
		}

		try {
			const response = await fetch('/api/admin/users/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, email, role, authSource })
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to create user');
			}

			setFormMessage({ text: 'User created successfully!', type: 'success' });
			
			// Reset form after a delay
			setTimeout(() => {
				setShowAddForm(false);
				setFormData({ username: '', email: '', role: 'reader', authSource: 'github' });
				setFormMessage(null);
			}, 1500);

			await refetch();
		} catch (error) {
			console.error('Error creating user:', error);
			setFormMessage({ 
				text: error instanceof Error ? error.message : 'Failed to create user',
				type: 'error' 
			});
		}
	}

	function cancelAdd() {
		setShowAddForm(false);
		setFormData({ username: '', email: '', role: 'reader', authSource: 'github' });
		setFormMessage(null);
	}

	return (
		<div class="flex flex-col gap-4">
			<div class="flex gap-2">
				<button 
					onClick={() => setShowAddForm(!showAddForm())}
					class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
				>
					{showAddForm() ? 'Hide Form' : 'Add User'}
				</button>
				<button 
					onClick={() => refetch()}
					class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
				>
					Refresh
				</button>
			</div>

			<Show when={showAddForm()}>
				<div class="flex flex-col gap-3 p-4 border border-amber-300 dark:border-amber-600 rounded bg-white dark:bg-gray-900">
					<h3 class="font-semibold text-lg">Add New User</h3>
					<form onSubmit={createUser} class="flex flex-col gap-3">
						<input 
							type="text" 
							value={formData().username}
							onInput={(e) => setFormData({ ...formData(), username: e.currentTarget.value })}
							placeholder="Username" 
							class="px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-600"
						/>
						<input 
							type="email" 
							value={formData().email}
							onInput={(e) => setFormData({ ...formData(), email: e.currentTarget.value })}
							placeholder="Email" 
							class="px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-600"
						/>
						<select 
							value={formData().role}
							onChange={(e) => setFormData({ ...formData(), role: e.currentTarget.value as User['role'] })}
							class="px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-600"
						>
							<option value="reader">Reader</option>
							<option value="editor">Editor</option>
							<option value="admin">Admin</option>
						</select>
						<select 
							value={formData().authSource}
							onChange={(e) => setFormData({ ...formData(), authSource: e.currentTarget.value })}
							class="px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-600"
						>
							<option value="github">GitHub</option>
							<option value="google">Google</option>
							<option value="microsoft">Microsoft</option>
						</select>
						<div class="flex gap-2">
							<button 
								type="submit"
								class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
							>
								Create
							</button>
							<button 
								type="button"
								onClick={cancelAdd}
								class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
							>
								Cancel
							</button>
						</div>
						<Show when={formMessage()}>
							<div class={`text-sm ${formMessage()?.type === 'error' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
								{formMessage()?.text}
							</div>
						</Show>
					</form>
				</div>
			</Show>

			<Show when={users.loading}>
				<div class="text-center py-4">Loading users...</div>
			</Show>

			<Show when={users.error}>
				<div class="text-red-600 dark:text-red-400 py-4">
					Failed to load users. Please try again.
				</div>
			</Show>

			<Show when={users()}>
				<div class="flex flex-col gap-3">
					<For each={users()}>
						{(user) => (
							<div class="p-4 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800">
								<div class="flex justify-between items-start gap-4">
									<div class="flex-1">
										<div class="font-semibold text-lg">{user.username}</div>
										<div class="text-sm opacity-70">{user.email}</div>
										<div class="flex gap-3 mt-2 text-sm">
											<span class="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
												{user.role}
											</span>
											<span class="px-2 py-1 rounded bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
												{user.authSource}
											</span>
											<span class={`px-2 py-1 rounded ${user.isActive ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'}`}>
												{user.isActive ? 'Active' : 'Inactive'}
											</span>
											<Show when={!user.githubId}>
												<span class="px-2 py-1 rounded bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
													Pending First Login
												</span>
											</Show>
										</div>
										<div class="text-xs opacity-50 mt-2">
											ID: {user.id} {user.githubId ? `| GitHub ID: ${user.githubId}` : ''}
										</div>
									</div>
									<div class="flex flex-col gap-2">
										<select 
											value={user.role}
											onChange={(e) => updateUserRole(user.id, e.currentTarget.value)}
											class="text-sm px-2 py-1 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
										>
											<option value="reader">Reader</option>
											<option value="editor">Editor</option>
											<option value="admin">Admin</option>
										</select>
										<button 
											onClick={() => toggleUserActive(user.id, !user.isActive)}
											class={`text-sm px-3 py-1 font-medium ${user.isActive ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'} text-white rounded transition-colors`}
										>
											{user.isActive ? 'Deactivate' : 'Activate'}
										</button>
										<button 
											onClick={() => deleteUser(user.id, user.username)}
											class="text-sm px-3 py-1 font-medium bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
										>
											Delete
										</button>
									</div>
								</div>
							</div>
						)}
					</For>
				</div>
			</Show>
		</div>
	);
}
