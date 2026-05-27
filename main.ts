import {
	App,
	MenuItem,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	TFolder,
	normalizePath,
} from 'obsidian';

interface RightClickToolsSettings {
	targetFolder: string;
	enableMoveContext: boolean;
	enableCreateTodayFolder: boolean;
	enableCreateTodayNote: boolean;
	todayNoteFolder: string;
	todayNoteTemplate: string;
	enableRibbonTodayNote: boolean;
}

const DEFAULT_SETTINGS: RightClickToolsSettings = {
	targetFolder: 'Archive',
	enableMoveContext: true,
	enableCreateTodayFolder: true,
	enableCreateTodayNote: true,
	todayNoteFolder: '',
	todayNoteTemplate: '',
	enableRibbonTodayNote: true,
};

export default class FileMoverPlugin extends Plugin {
	settings: RightClickToolsSettings;
	private ribbonEl: HTMLElement | null = null;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new FileMoverSettingTab(this.app, this));

		this.addCommand({
			id: 'create-today-folder',
			name: '今日の日付のフォルダを作成',
			checkCallback: (checking) => {
				if (!this.settings.enableCreateTodayFolder) return false;
				if (!checking) void this.createTodayFolder(this.app.vault.getRoot());
				return true;
			},
		});

		this.addCommand({
			id: 'create-today-note',
			name: 'デイリーノートを作成',
			checkCallback: (checking) => {
				if (!this.settings.enableCreateTodayNote) return false;
				if (!checking) void this.createTodayNote(this.app.vault.getRoot());
				return true;
			},
		});

		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file) => {
				const targetFolder = file instanceof TFolder ? file : (file?.parent ?? this.app.vault.getRoot());

				if (this.settings.enableMoveContext) {
					menu.addItem((item: MenuItem) => {
						item
							.setTitle(this.getMoveLabel())
							.setIcon('folder-plus')
							.onClick(async () => {
								if (file instanceof TFile || file instanceof TFolder) {
									await this.moveFileOrFolder(file);
								}
							});
					});
				}

				if (this.settings.enableCreateTodayFolder) {
					menu.addItem((item: MenuItem) => {
						item
							.setTitle('今日の日付のフォルダを作成')
							.setIcon('folder')
							.onClick(async () => {
								await this.createTodayFolder(targetFolder);
							});
					});
				}

				if (this.settings.enableCreateTodayNote) {
					menu.addItem((item: MenuItem) => {
						item
							.setTitle('デイリーノートを作成')
							.setIcon('file-plus')
							.onClick(async () => {
								await this.createTodayNote(targetFolder);
							});
					});
				}
			})
		);

		this.registerEvent(
			this.app.workspace.on('files-menu', (menu, files) => {
				if (!this.settings.enableMoveContext) return;

				menu.addItem((item: MenuItem) => {
					item
						.setTitle(this.getMoveLabel())
						.setIcon('folder-plus')
						.onClick(async () => {
							let movedCount = 0;
							for (const file of files) {
								if (file instanceof TFile || file instanceof TFolder) {
									await this.moveFileOrFolder(file);
									movedCount++;
								}
							}
							if (movedCount > 1) {
								new Notice(`${movedCount} 件を ${this.settings.targetFolder} に移行しました`);
							}
						});
				});
			})
		);

		this.refreshRibbonButton();
	}

	onunload() {
		this.removeRibbonButton();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private getMoveLabel() {
		return this.settings.targetFolder ? `「${this.settings.targetFolder}」に移行` : '指定フォルダに移行';
	}

	private async moveFileOrFolder(file: TFile | TFolder) {
		if (!this.settings.targetFolder) {
			new Notice('移行先フォルダが設定されていません。設定から移行先フォルダを指定してください。');
			return;
		}

		try {
			const targetPath = await this.getTargetPath(file);
			if (file instanceof TFile) {
				await this.moveFile(file, targetPath);
			} else {
				await this.moveFolder(file, targetPath);
			}
			new Notice(`${file.name} を ${this.settings.targetFolder} に移行しました`);
		} catch (error) {
			new Notice(`移行に失敗しました: ${this.getErrorMessage(error)}`);
			console.error('File move error:', error);
		}
	}

	private async getTargetPath(file: TFile | TFolder): Promise<string> {
		const targetPath = normalizePath(`${this.settings.targetFolder}/${file.path}`);
		const targetDir = targetPath.substring(0, targetPath.lastIndexOf('/'));
		await this.ensureDirectoryExists(targetDir);
		return targetPath;
	}

	private async ensureDirectoryExists(dirPath: string) {
		const dirs = normalizePath(dirPath).split('/');
		let currentPath = '';

		for (const dir of dirs) {
			if (!dir) continue;
			currentPath += (currentPath ? '/' : '') + dir;
			const existingFolder = this.app.vault.getAbstractFileByPath(currentPath);
			if (!existingFolder) {
				await this.app.vault.createFolder(currentPath);
			}
		}
	}

	private async moveFile(file: TFile, targetPath: string) {
		let finalPath = targetPath;
		let counter = 1;

		while (this.app.vault.getAbstractFileByPath(finalPath)) {
			const extension = file.extension ? `.${file.extension}` : '';
			const dir = finalPath.substring(0, finalPath.lastIndexOf('/'));
			finalPath = `${dir}/${file.basename} (${counter})${extension}`;
			counter++;
		}

		await this.app.fileManager.renameFile(file, finalPath);
	}

	private async moveFolder(folder: TFolder, targetPath: string) {
		let finalPath = targetPath;
		let counter = 1;

		while (this.app.vault.getAbstractFileByPath(finalPath)) {
			const parentDir = finalPath.substring(0, finalPath.lastIndexOf('/'));
			finalPath = `${parentDir}/${folder.name} (${counter})`;
			counter++;
		}

		await this.app.fileManager.renameFile(folder, finalPath);
	}

	private formatToday() {
		const now = new Date();
		const yyyy = now.getFullYear();
		const mm = String(now.getMonth() + 1).padStart(2, '0');
		const dd = String(now.getDate()).padStart(2, '0');
		return `${yyyy}-${mm}-${dd}`;
	}

	private formatTime() {
		const now = new Date();
		const hh = String(now.getHours()).padStart(2, '0');
		const min = String(now.getMinutes()).padStart(2, '0');
		return `${hh}:${min}`;
	}

	private renderTemplate(content: string, title: string) {
		const date = this.formatToday();
		const time = this.formatTime();
		return content
			.replace(/\{\{\s*date\s*\}\}/gi, date)
			.replace(/\{\{\s*time\s*\}\}/gi, time)
			.replace(/\{\{\s*title\s*\}\}/gi, title);
	}

	private async getTodayNoteTemplateContent(baseName: string) {
		const templatePath = (this.settings.todayNoteTemplate || '').trim();
		if (!templatePath) return '';

		const normalizedPath = normalizePath(templatePath.endsWith('.md') ? templatePath : `${templatePath}.md`);
		const templateFile = this.app.vault.getAbstractFileByPath(normalizedPath);
		if (!(templateFile instanceof TFile)) {
			new Notice(`テンプレートが見つかりません: ${normalizedPath}`, 5000);
			return '';
		}

		const content = await this.app.vault.read(templateFile);
		return this.renderTemplate(content, baseName);
	}

	private async createTodayFolder(parent: TFolder) {
		const parentPath = parent?.path ? parent.path : '/';
		const baseName = this.formatToday();
		let folderPath = normalizePath(parentPath === '/' || parentPath === '' ? baseName : `${parentPath}/${baseName}`);
		let suffix = 0;

		while (this.app.vault.getAbstractFileByPath(folderPath)) {
			suffix += 1;
			const name = `${baseName}_${suffix}`;
			folderPath = normalizePath(parentPath === '/' || parentPath === '' ? name : `${parentPath}/${name}`);
		}

		try {
			await this.app.vault.createFolder(folderPath);
			new Notice(`作成: ${folderPath}`);

			const untitledBase = '無題のファイル';
			const ext = '.md';
			let notePath = normalizePath(`${folderPath}/${untitledBase}${ext}`);
			let noteCounter = 1;

			while (this.app.vault.getAbstractFileByPath(notePath)) {
				notePath = normalizePath(`${folderPath}/${untitledBase} (${noteCounter})${ext}`);
				noteCounter += 1;
			}

			const noteFile = await this.app.vault.create(notePath, '');
			new Notice(`作成: ${notePath}`);

			const leaf = this.app.workspace.getLeaf(true);
			await leaf.openFile(noteFile);
		} catch (error) {
			console.error(error);
			new Notice('フォルダ作成に失敗しました。コンソールを確認してください。', 5000);
		}
	}

	private async createTodayNote(parent: TFolder | null, folderOverride?: string) {
		const baseName = this.formatToday();
		const overridePath = typeof folderOverride === 'string' ? folderOverride.trim() : '';
		let dirPath = '';

		if (overridePath) {
			const normalizedOverride = normalizePath(overridePath);
			if (normalizedOverride && normalizedOverride !== '.') {
				await this.ensureDirectoryExists(normalizedOverride);
				dirPath = normalizedOverride;
			}
		} else {
			const parentPath = parent?.path ? parent.path : '/';
			dirPath = parentPath === '/' || parentPath === '' ? '' : parentPath;
		}

		if (dirPath === '/') dirPath = '';

		const baseDir = dirPath ? `${dirPath}/` : '';
		let notePath = normalizePath(`${baseDir}${baseName}.md`);
		let suffix = 0;

		while (this.app.vault.getAbstractFileByPath(notePath)) {
			suffix += 1;
			notePath = normalizePath(`${baseDir}${baseName}_${suffix}.md`);
		}

		try {
			const noteContent = await this.getTodayNoteTemplateContent(baseName);
			const noteFile = await this.app.vault.create(notePath, noteContent);
			new Notice(`作成: ${notePath}`);

			const leaf = this.app.workspace.getLeaf(true);
			await leaf.openFile(noteFile);
		} catch (error) {
			console.error(error);
			new Notice('ノート作成に失敗しました。コンソールを確認してください。', 5000);
		}
	}

	private removeRibbonButton() {
		this.ribbonEl?.remove();
		this.ribbonEl = null;
	}

	refreshRibbonButton() {
		this.removeRibbonButton();
		if (!this.settings.enableRibbonTodayNote) return;

		const ribbon = this.addRibbonIcon('calendar-plus', '指定フォルダに今日の日付ノートを作成', async () => {
			const folderPath = (this.settings.todayNoteFolder || '').trim();
			if (!folderPath) {
				new Notice('設定画面で日付ノート用フォルダを指定してください。', 5000);
				return;
			}
			await this.createTodayNote(null, folderPath);
		});

		ribbon.setAttribute('aria-label', '指定フォルダに今日の日付ノートを作成');
		this.ribbonEl = ribbon;
	}

	private getErrorMessage(error: unknown) {
		return error instanceof Error ? error.message : String(error);
	}
}

class FileMoverSettingTab extends PluginSettingTab {
	plugin: FileMoverPlugin;

	constructor(app: App, plugin: FileMoverPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl('h2', { text: 'Right-Click Tools Settings' });

		new Setting(containerEl)
			.setName('移行先フォルダ')
			.setDesc('ファイル・フォルダを移行する先のフォルダ名を指定してください')
			.addText((text) => text
				.setPlaceholder('Archive')
				.setValue(this.plugin.settings.targetFolder)
				.onChange(async (value) => {
					this.plugin.settings.targetFolder = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('移行メニューを表示')
			.setDesc('右クリックメニューに「指定フォルダに移行」を表示します')
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.enableMoveContext)
				.onChange(async (value) => {
					this.plugin.settings.enableMoveContext = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('日付フォルダを作成')
			.setDesc('日付でフォルダを作成する機能を利用可能にします')
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.enableCreateTodayFolder)
				.onChange(async (value) => {
					this.plugin.settings.enableCreateTodayFolder = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('日付ノートを作成')
			.setDesc('日付でノートを作成する機能を利用可能にします')
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.enableCreateTodayNote)
				.onChange(async (value) => {
					this.plugin.settings.enableCreateTodayNote = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('日付ノートの保存先フォルダ')
			.setDesc('リボンボタンから作成する日付ノートの保存先を設定します')
			.addText((text) => text
				.setPlaceholder('Daily Notes')
				.setValue(this.plugin.settings.todayNoteFolder)
				.onChange(async (value) => {
					this.plugin.settings.todayNoteFolder = value;
					await this.plugin.saveSettings();
					this.plugin.refreshRibbonButton();
				}));

		new Setting(containerEl)
			.setName('日付ノートテンプレート')
			.setDesc('日付ノート作成時に読み込むテンプレートノートのパスを設定します')
			.addText((text) => text
				.setPlaceholder('9_Template/daily-note')
				.setValue(this.plugin.settings.todayNoteTemplate)
				.onChange(async (value) => {
					this.plugin.settings.todayNoteTemplate = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('リボンに日付ノートボタンを表示')
			.setDesc('上部リボンに指定フォルダに日付ノートを作成するボタンを表示します')
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.enableRibbonTodayNote)
				.onChange(async (value) => {
					this.plugin.settings.enableRibbonTodayNote = value;
					await this.plugin.saveSettings();
					this.plugin.refreshRibbonButton();
				}));

		containerEl.createEl('p', {
			text: '注意: 移行先フォルダが存在しない場合は自動的に作成されます。元のフォルダ構造は移行先でも維持されます。',
		});
	}
}
