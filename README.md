### How to use
1. Add title in `post/index.txt` file (modify **category = research/blog/ctf**)
```json
    { 
        "title": "CTF Writeup",
        "category": "ctf",
        "file": "posts/ctf/demo.md",
        "date": "2026-01-01",
        "description": "No data.",
        "tags": ["reverse", "web", "crypto"]
    },
```
2. Add Markdown file to `/posts` folder

---

### On-page navigation (Table of Contents)

Each post automatically builds a clickable **"On this page"** sidebar from your Markdown headings. Clicking an entry smooth-scrolls to that section, and the current section is highlighted as you scroll.

**Writing guidelines:**
- Use `#` to `####` headings (`h1`–`h4`). Headings deeper than `####` are not listed.
- Indentation follows heading depth: the shallowest heading in the post sits flush-left, and each extra `#` indents one more level. So a post using only `##`/`###` aligns the `##` items to the left edge.
- Keep the hierarchy consistent (don't jump from `#` straight to `####`) for readable indentation.
- The sidebar only appears when a post has **2 or more headings**; long heading titles wrap onto multiple lines instead of being cut off.

```markdown
# Title
## Overview
## Analysis
### Static analysis
## Exploit
```

---

### Notice !!!
- The current **Code block** supports syntax highlighting for the following language: C/C++ (use c), python, javascript, bash, html/xml/markup (use markup), asm (use nasm) and json.
- If a language other than those listed above is used, C will be applied by default.
```
    ```nasm
        mov  rax, 0x1
    ```
```