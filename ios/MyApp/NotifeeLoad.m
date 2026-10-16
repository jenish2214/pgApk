#import <RNNotifee/NotifeeApiModule.h>
#import <React/RCTBridge.h>

/**
 * RNNotifee is a static library. Without a hard reference, the linker can drop
 * NotifeeApiModule.o, RCT_EXPORT_MODULE never runs, and JS throws
 * "Notifee native module not found".
 */
__attribute__((constructor)) static void KeepNotifeeLinked(void)
{
#ifndef RCT_REMOVE_LEGACY_MODULE_INTEROP
  RCTEnableTurboModuleInterop(YES);
#endif
  (void)[NotifeeApiModule class];
}
