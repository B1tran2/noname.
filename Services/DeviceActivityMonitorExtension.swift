import DeviceActivity
import ManagedSettings

final class NonameDeviceActivityMonitor: DeviceActivityMonitor {
    private let store = ManagedSettingsStore()

    override func intervalDidEnd(for activity: DeviceActivityName) {
        super.intervalDidEnd(for: activity)
        store.shield.applications = nil
        store.shield.applicationCategories = nil
    }
}

// NOTE:
// This class must live in a Device Activity Monitor extension target to run.
// Add a new "Device Activity Monitor" extension in Xcode and move this file
// into that target. Ensure the extension's bundle ID matches your app group.
