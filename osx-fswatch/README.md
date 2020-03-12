# osx-fswatch

Implemented something like fswatch, mostly for my own learning.

```
osx-fswatch path/to/dir path/to/dir2

Waits until filesystem event under given dirs, then exits.
If no directories specified, watches foor events under current directory
```

As an example, this can be used with `rsync` to rsync the current directory on file changes:

```
while true; do
  rsync -avz ./ remote:~/remote-dir/
  osx-fswatch
done
```
