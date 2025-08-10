import { Plugin, TFile, TFolder, MenuItem, Notice, PluginSettingTab, App, Setting } from 'obsidian';

interface FileMoverSettings {
	targetFolder: string;
}

const DEFAULT_SETTINGS: FileMoverSettings = {
	targetFolder: 'Archive'
}

export default class FileMoverPlugin extends Plugin {
	settings: FileMoverSettings;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new FileMoverSettingTab(this.app, this));

		// ファイルエクスプローラーの右クリックメニューにアイテムを追加
		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file) => {
				menu.addItem((item: MenuItem) => {
					item
						.setTitle('指定フォルダに移行')
						.setIcon('folder-plus')
						.onClick(async () => {
							if (file instanceof TFile || file instanceof TFolder) {
								await this.moveFileOrFolder(file);
							}
						});
				});
			})
		);
	}

	onunload() {
		// プラグインがアンロードされる時のクリーンアップ処理
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
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
			} else if (file instanceof TFolder) {
				await this.moveFolder(file, targetPath);
			}

			new Notice(`${file.name} を ${this.settings.targetFolder} に移行しました`);
		} catch (error) {
			new Notice(`移行に失敗しました: ${error.message}`);
			console.error('File move error:', error);
		}
	}

	private async getTargetPath(file: TFile | TFolder): Promise<string> {
		// ルートからの相対パスを取得
		const relativePath = file.path;
		
		// 移行先フォルダと元のパス構造を組み合わせ
		const targetPath = `${this.settings.targetFolder}/${relativePath}`;
		
		// 移行先のディレクトリを作成
		const targetDir = targetPath.substring(0, targetPath.lastIndexOf('/'));
		await this.ensureDirectoryExists(targetDir);
		
		return targetPath;
	}

	private async ensureDirectoryExists(dirPath: string) {
		const dirs = dirPath.split('/');
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
		// ファイル名が重複する場合は番号を付ける
		let finalPath = targetPath;
		let counter = 1;
		
		while (this.app.vault.getAbstractFileByPath(finalPath)) {
			const extension = file.extension ? `.${file.extension}` : '';
			const nameWithoutExt = file.basename;
			const dir = finalPath.substring(0, finalPath.lastIndexOf('/'));
			finalPath = `${dir}/${nameWithoutExt} (${counter})${extension}`;
			counter++;
		}

		await this.app.fileManager.renameFile(file, finalPath);
	}

	private async moveFolder(folder: TFolder, targetPath: string) {
		// フォルダ名が重複する場合は番号を付ける
		let finalPath = targetPath;
		let counter = 1;
		
		while (this.app.vault.getAbstractFileByPath(finalPath)) {
			const parentDir = finalPath.substring(0, finalPath.lastIndexOf('/'));
			finalPath = `${parentDir}/${folder.name} (${counter})`;
			counter++;
		}

		await this.app.fileManager.renameFile(folder, finalPath);
	}
}

class FileMoverSettingTab extends PluginSettingTab {
	plugin: FileMoverPlugin;

	constructor(app: App, plugin: FileMoverPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'File Mover Settings'});

		new Setting(containerEl)
			.setName('移行先フォルダ')
			.setDesc('ファイル・フォルダを移行する先のフォルダ名を指定してください')
			.addText(text => text
				.setPlaceholder('Archive')
				.setValue(this.plugin.settings.targetFolder)
				.onChange(async (value) => {
					this.plugin.settings.targetFolder = value;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('p', {
			text: '注意: 移行先フォルダが存在しない場合は自動的に作成されます。元のフォルダ構造は移行先でも維持されます。'
		});
	}
}