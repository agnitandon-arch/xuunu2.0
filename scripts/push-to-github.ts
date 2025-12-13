import { getUncachableGitHubClient } from '../server/lib/github';
import * as fs from 'fs';
import * as path from 'path';

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    
    // Skip these directories and files
    if (file === 'node_modules' || 
        file === '.git' || 
        file === 'dist' || 
        file === '.cache' ||
        file === '.replit' ||
        file === 'replit.nix' ||
        file.startsWith('.') ||
        filePath.includes('/.')) {
      continue;
    }

    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  }

  return arrayOfFiles;
}

async function pushToGitHub() {
  try {
    const octokit = await getUncachableGitHubClient();
    const owner = 'agnitandon-arch';
    const repo = 'xuunu';

    console.log('🔍 Checking repository...');
    
    // Get repository details
    const { data: repoData } = await octokit.repos.get({ owner, repo });
    console.log(`✅ Found repository: ${repoData.full_name}`);

    // Get all files from current directory
    console.log('📁 Collecting files...');
    const allFiles = await getAllFiles(process.cwd());
    console.log(`Found ${allFiles.length} files to upload`);

    // Create blobs for each file
    console.log('📤 Creating blobs...');
    const blobs = await Promise.all(
      allFiles.map(async (filePath) => {
        const content = fs.readFileSync(filePath);
        const relativePath = path.relative(process.cwd(), filePath);
        
        const { data } = await octokit.git.createBlob({
          owner,
          repo,
          content: content.toString('base64'),
          encoding: 'base64',
        });

        return {
          path: relativePath,
          mode: '100644' as const,
          type: 'blob' as const,
          sha: data.sha,
        };
      })
    );

    console.log('🌲 Creating tree...');
    const { data: tree } = await octokit.git.createTree({
      owner,
      repo,
      tree: blobs,
    });

    console.log('💾 Creating commit...');
    const { data: commit } = await octokit.git.createCommit({
      owner,
      repo,
      message: 'Initial commit: Xuunu Health Tracking PWA',
      tree: tree.sha,
      parents: [], // No parent for initial commit
    });

    console.log('🚀 Updating main branch...');
    
    // Get current main branch reference
    const { data: currentRef } = await octokit.git.getRef({
      owner,
      repo,
      ref: 'heads/main',
    });

    // Update with parent commit (the current HEAD)
    const { data: newCommit } = await octokit.git.createCommit({
      owner,
      repo,
      message: 'Add Xuunu Health Tracking PWA source code',
      tree: tree.sha,
      parents: [currentRef.object.sha], // Include current HEAD as parent
    });

    // Update the reference to point to new commit
    await octokit.git.updateRef({
      owner,
      repo,
      ref: 'heads/main',
      sha: newCommit.sha,
      force: false,
    });

    console.log('✨ Success! Code pushed to GitHub');
    console.log(`🔗 View at: https://github.com/${owner}/${repo}`);
  } catch (error: any) {
    console.error('❌ Error pushing to GitHub:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

pushToGitHub();
