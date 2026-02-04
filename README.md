### How to use
1. Add title in `post/index.txt` file (modify **category = research/blogs/ctf**)
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

### Notice !!!
- The current **Code block** supports syntax highlighting for the following language: C/C++ (use c), python, javascript, bash, html/xml/markup (use markup), asm (use nasm) and json.
- If a language other than those listed above is used, C will be applied by default.
```
    ```nasm
        mov  rax, 0x1
    ```
```