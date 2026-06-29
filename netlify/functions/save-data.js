/**
 * Netlify Function to save data directly to GitHub.
 * Requires Environment Variables: GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO
 */

exports.handler = async (event, context) => {
    // 1. Authenticate Request
    const { user } = context.clientContext || {};
    if (!user) {
        return { statusCode: 401, body: "Unauthorized. Please log in." };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO } = process.env;
    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
        return { 
            statusCode: 500, 
            body: "Missing GitHub configuration. Please set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO environment variables." 
        };
    }

    try {
        const state = JSON.parse(event.body);
        const headers = {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };

        const baseUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;

        // Helper: Create a Blob in GitHub
        async function createBlob(content, encoding = 'utf-8') {
            const res = await fetch(`${baseUrl}/git/blobs`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ content, encoding })
            });
            if (!res.ok) throw new Error("Failed to create blob: " + await res.text());
            const data = await res.json();
            return data.sha;
        }

        const treeItems = [];

        // Helper: Process Base64 image
        async function processImage(imgObj) {
            if (!imgObj || !imgObj.isNew && !imgObj.dataUrl) return null;
            // imgObj.dataUrl is like "data:image/png;base64,iVBORw0KGgo..."
            const base64Data = imgObj.dataUrl.split(',')[1];
            if (!base64Data) return null;
            
            // Clean filename to prevent issues
            const safeName = imgObj.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
            const path = `uploads/${Date.now()}-${safeName}`;
            
            const sha = await createBlob(base64Data, 'base64');
            treeItems.push({
                path,
                mode: '100644',
                type: 'blob',
                sha
            });
            return path;
        }

        // Process Products
        for (let p of state.products) {
            if (p.main_image_new) {
                p.main_image = await processImage(p.main_image_new);
                delete p.main_image_new;
            }
            if (p.hover_image_new) {
                p.hover_image = await processImage(p.hover_image_new);
                delete p.hover_image_new;
            }
            if (p.extra_images) {
                for (let i = 0; i < p.extra_images.length; i++) {
                    if (p.extra_images[i].isNew) {
                        p.extra_images[i] = await processImage(p.extra_images[i]);
                    }
                }
            }
        }

        // Process Lookbook
        for (let i = 0; i < state.lookbook.length; i++) {
            if (state.lookbook[i].isNew) {
                state.lookbook[i] = await processImage(state.lookbook[i]);
            }
        }

        // Process Settings
        if (state.settings.desktop_banners) {
            for (let i = 0; i < state.settings.desktop_banners.length; i++) {
                if (state.settings.desktop_banners[i].isNew) {
                    state.settings.desktop_banners[i] = await processImage(state.settings.desktop_banners[i]);
                }
            }
        }
        if (state.settings.mobile_banner && state.settings.mobile_banner.isNew) {
            state.settings.mobile_banner = await processImage(state.settings.mobile_banner);
        }

        // Save JSONs as blobs
        const productsSha = await createBlob(JSON.stringify({ products: state.products }, null, 2));
        treeItems.push({ path: 'data/products.json', mode: '100644', type: 'blob', sha: productsSha });

        const lookbookSha = await createBlob(JSON.stringify({ lookbook: state.lookbook }, null, 2));
        treeItems.push({ path: 'data/lookbook.json', mode: '100644', type: 'blob', sha: lookbookSha });

        const settingsSha = await createBlob(JSON.stringify(state.settings, null, 2));
        treeItems.push({ path: 'data/settings.json', mode: '100644', type: 'blob', sha: settingsSha });

        // 2. Get current commit SHA
        const refRes = await fetch(`${baseUrl}/git/ref/heads/main`, { headers });
        if (!refRes.ok) throw new Error("Failed to get ref: " + await refRes.text());
        const refData = await refRes.json();
        const currentCommitSha = refData.object.sha;

        // 3. Get current tree SHA
        const commitRes = await fetch(`${baseUrl}/git/commits/${currentCommitSha}`, { headers });
        if (!commitRes.ok) throw new Error("Failed to get commit: " + await commitRes.text());
        const commitData = await commitRes.json();
        const baseTreeSha = commitData.tree.sha;

        // 4. Create new tree
        const createTreeRes = await fetch(`${baseUrl}/git/trees`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                base_tree: baseTreeSha,
                tree: treeItems
            })
        });
        if (!createTreeRes.ok) throw new Error("Failed to create tree: " + await createTreeRes.text());
        const newTreeData = await createTreeRes.json();

        // 5. Create new commit
        const createCommitRes = await fetch(`${baseUrl}/git/commits`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                message: "Update catalog via Admin Panel",
                tree: newTreeData.sha,
                parents: [currentCommitSha]
            })
        });
        if (!createCommitRes.ok) throw new Error("Failed to create commit: " + await createCommitRes.text());
        const newCommitData = await createCommitRes.json();

        // 6. Update reference (push)
        const updateRefRes = await fetch(`${baseUrl}/git/refs/heads/main`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
                sha: newCommitData.sha,
                force: false
            })
        });
        if (!updateRefRes.ok) throw new Error("Failed to update ref: " + await updateRefRes.text());

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Successfully updated." })
        };

    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: error.message || "Internal Server Error"
        };
    }
};
