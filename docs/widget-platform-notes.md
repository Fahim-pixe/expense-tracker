# Budget Widget Platform Notes

The app uses the Android-specific widget integration for the Budget Snapshot home-screen widget. This keeps the project compatible with its Expo SDK 54 baseline and supports updating the native Android widget from the app’s local finance state.

The official Expo Widgets documentation describes its package as an **iOS home-screen widget and Live Activity** solution, requiring a development build rather than Expo Go. The published package versions begin after this app’s SDK 54 baseline, so it is intentionally not included in the dependency set.

The Android widget is configured through the project’s app configuration and refreshed whenever local finance data changes. Tapping the widget opens the app’s existing budget destination.

## References

- [Expo Widgets documentation](https://docs.expo.dev/versions/latest/sdk/widgets/)
- [React Native Android Widget documentation](https://saleksovski.github.io/react-native-android-widget/)
