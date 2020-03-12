#include <iostream>
#include <stdlib.h>
#include <vector>

#include <CoreServices/CoreServices.h>

using namespace std;
using std::vector;

CFStringRef toCFString(const char *s)
{
        return CFStringCreateWithCString(kCFAllocatorDefault, s,
                                         kCFStringEncodingUTF8);
}

void readDirsFromArgs(int argc, char **argv, vector<CFStringRef> &dirs)
{
        for (int i = 1; i < argc; i++)
        {
                dirs.push_back(toCFString(argv[i]));
        }

        // Default to ./ if no dirs are set
        if (dirs.size() == 0)
        {
                dirs.push_back(toCFString("."));
        }
}

void usage()
{
        cout << "osx-fswatch path/to/dir path/to/dir2 path/to/file\n\n";
        cout << "Waits until filesystem event under given dirs, then exits.\n";
        cout << "If no directories specified, watches foor events under current directory\n\n";
}

// Callback for FSEvent
void onFSEvent(ConstFSEventStreamRef streamRef, void *callbackInfo,
               size_t numEvents,
               void *eventPaths, // raw C array of raw C strings
               const FSEventStreamEventFlags *eventFlags,
               const FSEventStreamEventId *eventIds)
{
        for (int i = 0; i < numEvents; i++)
        {
                cout << "FSEvent: " << static_cast<char **>(eventPaths)[0] << "\n";
        }

        // Stop RunLoop so main thread will continue
        CFRunLoopStop(CFRunLoopGetCurrent());
}

int main(int argc, char **argv)
{
        for (int i = 0; i < argc; i++)
        {
                if (strcmp(argv[i], "-h") == 0 || strcmp(argv[i], "--help") == 0 || strcmp(argv[i], "help") == 0)
                {
                        usage();
                        exit(1);
                }
        }

        vector<CFStringRef> dirs;
        readDirsFromArgs(argc, argv, dirs);

        cout << "Watching ";
        for (int i = 0; i < dirs.size(); i++)
        {
                cout << CFStringGetCStringPtr(dirs[i], kCFStringEncodingUTF8) << " ";
        }
        cout << "\n";

        CFArrayRef pathsToWatch = CFArrayCreate(
            kCFAllocatorDefault, reinterpret_cast<const void **>(&dirs[0]),
            dirs.size(), NULL);

        FSEventStreamRef stream =
            FSEventStreamCreate(kCFAllocatorDefault, &onFSEvent,
                                NULL, // callback context
                                pathsToWatch, kFSEventStreamEventIdSinceNow,
                                1, // 1 second between events
                                kFSEventStreamCreateFlagFileEvents);
        FSEventStreamScheduleWithRunLoop(stream, CFRunLoopGetCurrent(),
                                         kCFRunLoopDefaultMode);

        bool res = FSEventStreamStart(stream);
        if (!res)
        {
                cout << "Starting FSEventStream failed\n";
                return 1;
        }

        CFRunLoopRun();

        // Cleanup
        FSEventStreamStop(stream);
        FSEventStreamInvalidate(stream);
        FSEventStreamRelease(stream);

        return 0;
}
