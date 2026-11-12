# Fiyat Alarmı Sistemi: Flutter Karşılıkları

Bu belge, [FIYAT_ALARMI_EGITIM.md](FIYAT_ALARMI_EGITIM.md) içinde anlatılan React Native / Expo
çözümünün Flutter'da nasıl kurulacağını anlatır. Önce eğitim belgesini okuyun; burada her React
Native kavramının karşılığı, mimari farklar, çalışır bir iskelet ve Flutter'a özgü tuzaklar vardır.

> Bu belgedeki Flutter kodu **iskelettir**: bu projede çalıştırılmadı. Paket sürümleri ve API'ler
> zamanla değişir; kurmadan önce pub.dev ve Firebase dokümanlarından güncel hâlini doğrulayın.

İçindekiler

1. En önemli fark: Expo Push yok, FCM doğrudan
2. Kavram eşleme tablosu
3. Mimari: aynı katmanlar, Dart'ta
4. Kurulum adımları (Android + iOS)
5. Kod iskeleti
6. Sunucu tarafında değişenler
7. Arka plan ve kapalı durum davranışı
8. Derleme, yayın, ortam değişkenleri
9. Test
10. Flutter ekibi için dikkat edilecekler
11. Mülakat soruları (Flutter tarafı)
12. Hangi platformu ne zaman seçmeli?

---

## 1. En önemli fark: Expo Push yok, FCM doğrudan

React Native/Expo çözümünde zincir `uygulama → Expo Push Service → FCM/APNs` idi ve token
`ExponentPushToken[...]` biçimindeydi. Flutter'da standart yol **Firebase Cloud Messaging'i
doğrudan** kullanmaktır:

```
Android: Flutter uygulaması ◀── FCM
iOS    : Flutter uygulaması ◀── APNs ◀── FCM   (Firebase, APNs'e köprü olur)
```

Sonuçları:

| Konu | React Native / Expo | Flutter |
| --- | --- | --- |
| Token türü | `ExponentPushToken[...]` | **FCM kayıt token'ı** (iOS'ta APNs token'ı FCM'e bağlanır) |
| Sunucu gönderimi | Expo Push HTTP API | **FCM HTTP v1** (`firebase-admin` `messaging().send`) |
| Android kimlik bilgisi | FCM V1 servis hesabı **EAS'a** yüklenir | Sunucu zaten Firebase Admin; ek EAS adımı yok |
| iOS kimlik bilgisi | APNs `.p8` **EAS'a** yüklenir | APNs `.p8` **Firebase konsoluna** (Project settings > Cloud Messaging) yüklenir |
| Yapılandırma dosyaları | Android için `google-services.json` | Android `google-services.json` **ve** iOS `GoogleService-Info.plist` |
| Yapılandırma aracı | `app.json` + config plugin | `flutterfire configure` + native proje ayarları |

Not: Expo Push Service'in RN'deki avantajı iki platformu tek API'de birleştirmesiydi. FCM v1
de iki platforma tek API ile gönderir, bu yüzden Flutter'da bu avantaj kaybolmaz.

---

## 2. Kavram eşleme tablosu

| React Native / Expo (bu proje) | Flutter karşılığı |
| --- | --- |
| `expo-notifications` | `firebase_messaging` (uzak) + `flutter_local_notifications` (yerel/ön plan) |
| `getExpoPushTokenAsync` | `FirebaseMessaging.instance.getToken()`; iOS'ta önce `getAPNSToken()` hazır olmalı |
| İzin: `requestPermissionsAsync` | `FirebaseMessaging.instance.requestPermission(...)`; Android 13+: `flutter_local_notifications` içinden `requestNotificationsPermission()` ya da `permission_handler` |
| `setNotificationHandler` (ön plan gösterimi) | iOS: `setForegroundNotificationPresentationOptions(alert, badge, sound)`. **Android: ön planda FCM bildirimi otomatik gösterilmez**, `onMessage` dinleyip `flutter_local_notifications` ile siz gösterirsiniz |
| `addNotificationResponseReceivedListener` | `FirebaseMessaging.onMessageOpenedApp` (arka plandan dokunma) |
| `getLastNotificationResponseAsync` | `FirebaseMessaging.instance.getInitialMessage()` (kapalıdan dokunma) |
| Android kanalı `setNotificationChannelAsync` | `AndroidNotificationChannel` + `AndroidFlutterLocalNotificationsPlugin.createNotificationChannel` |
| Token yenilenmesi (RN'de elle kontrol) | `FirebaseMessaging.instance.onTokenRefresh` akışı |
| `AsyncStorage` | `shared_preferences` (sır için `flutter_secure_storage`; yapısal veri için `drift`/`hive`/`isar`) |
| `fetch` | `http` ya da `dio` paketi |
| `AppState` | `WidgetsBindingObserver.didChangeAppLifecycleState` (`AppLifecycleState.resumed/paused`) |
| `setInterval` | `Timer.periodic` |
| `useState` | `StatefulWidget` + `setState`, ya da bir state yöneticisinin durumu |
| Context + Provider + custom hook | `provider` (`ChangeNotifier` + `context.watch`) ya da **Riverpod** `Notifier`/`AsyncNotifier`, ya da **Bloc/Cubit** |
| `useEffect` (açılış) | `initState`, Riverpod'da `build`/`ref.listen`, Bloc'ta ilk event |
| `useEffect` temizleme | `dispose`, `ref.onDispose`, `StreamSubscription.cancel()` |
| `useRef` | Sınıf alanı (`late` / `final`), `ValueNotifier` |
| `useMemo` / `useCallback` | Genelde gerekmez; `const` widget'lar, `select` (Riverpod), `Selector` (provider) |
| Expo Router (dosya tabanlı rota) | `go_router` (bildirimsel rota tanımı), `auto_route` |
| `useLocalSearchParams` | `GoRouterState.uri.queryParameters` |
| Derin bağlantı (`altinkasam://`) | `go_router` + `app_links`; Android `intent-filter`, iOS `CFBundleURLTypes`/Universal Links |
| Platform dalı `Platform.OS` | `Platform.isAndroid` / `Platform.isIOS` (`dart:io`), `kIsWeb` |
| Config plugin | Elle `AndroidManifest.xml`, `Info.plist`, `build.gradle`, Xcode ayarları |
| Expo API Routes | Ayrı sunucu (Cloud Functions, Cloud Run, Dart Frog, Node); Flutter'ın yerleşik karşılığı yoktur |
| `EXPO_PUBLIC_*` | `--dart-define` / `--dart-define-from-file` ve `String.fromEnvironment`; ortamlar için **flavors** |
| `app.json` | `pubspec.yaml` (bağımlılık/asset) + native yapılandırma dosyaları |
| `expo-widgets` | `home_widget` paketi (iOS WidgetKit/Android App Widget yine native kod ister) |
| Expo Router `router.push` | `context.go('/alarm')` / `context.push('/alarm')` |
| EAS Build | `flutter build appbundle` / `flutter build ipa`; CI: Codemagic, GitHub Actions, Fastlane |
| EAS Credentials | Apple: Xcode otomatik imza ya da Fastlane `match`; Android: `key.properties` / Play App Signing |
| EAS Update (OTA) | **Yerleşik yok.** Shorebird gibi üçüncü taraf kod-itme (code push) çözümleri vardır |
| `expo-doctor` | `flutter doctor` |
| Jest | `flutter_test` |
| Maestro/Detox | `integration_test` (Flutter), Maestro (her ikisiyle de çalışır) |

---

## 3. Mimari: aynı katmanlar, Dart'ta

Bu projedeki MVVM + Repository katmanları Flutter'a aynen taşınır:

```
lib/
  core/
    constants/alarm_assets.dart
    storage/key_value_store.dart
  domain/
    price_alarm.dart                 // model (immutable; freezed ya da elle)
  data/
    datasources/
      notifications_service.dart     // firebase_messaging + flutter_local_notifications
      alarm_sync_datasource.dart     // http
    repositories/
      alarm_repository.dart          // shared_preferences
  viewmodels/
    alarm_controller.dart            // ChangeNotifier ya da Riverpod Notifier
  ui/
    alarm_screen.dart
  main.dart                          // Firebase.initializeApp, arka plan handler, runApp
```

Eşleme:

| Bu projedeki dosya | Flutter'da |
| --- | --- |
| `AlarmProvider.tsx` | `AlarmController` (`ChangeNotifier`) ya da Riverpod `AlarmNotifier` |
| `alarmRepository.ts` | `AlarmRepository` sınıfı |
| `notificationsDatasource.ts` | `NotificationsService` |
| `alarmSyncDatasource.ts` | `AlarmSyncDatasource` |
| `app/alarm.tsx` | `AlarmScreen` widget'ı |
| `app/_layout.tsx` (`onOpen`) | `main.dart` + `go_router` yönlendirme |

---

## 4. Kurulum adımları

### 4.1 Ortak

1. Firebase projesi (mevcut `altin-kasam-628d2` kullanılabilir) → uygulamaları ekleyin (Android ve iOS).
2. FlutterFire CLI:
   ```bash
   dart pub global activate flutterfire_cli
   flutterfire configure
   ```
   Bu komut `lib/firebase_options.dart` üretir ve platform dosyalarını bağlar.
3. `pubspec.yaml`:
   ```yaml
   dependencies:
     firebase_core: ^latest
     firebase_messaging: ^latest
     flutter_local_notifications: ^latest
     shared_preferences: ^latest
     http: ^latest
     go_router: ^latest
     provider: ^latest   # ya da flutter_riverpod
   ```
   Sürümleri `flutter pub add` ile güncel alın.

### 4.2 Android

1. `android/app/google-services.json` (FlutterFire ekler ya da elle koyun).
2. `android/build.gradle` ve `android/app/build.gradle`: Google Services eklentisi (FlutterFire genelde yapar).
3. `AndroidManifest.xml`: `<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>` (Android 13+).
4. Varsayılan kanal kimliği için (isteğe bağlı) `AndroidManifest.xml` içine
   `com.google.firebase.messaging.default_notification_channel_id` meta verisi.
5. `minSdkVersion` Firebase gereksinimine uygun olmalı.

### 4.3 iOS

1. Xcode'da **Signing & Capabilities** → **Push Notifications** ve **Background Modes > Remote notifications**.
2. Apple Developer'da **APNs Auth Key (.p8)** oluşturun → Firebase konsolu > Project settings >
   **Cloud Messaging** > Apple app configuration → `.p8`, Key ID, Team ID yükleyin.
   (RN'de bu anahtar EAS'a yüklenmişti; Flutter'da **Firebase'e** yüklenir.)
3. `ios/Runner/GoogleService-Info.plist` (FlutterFire ekler).
4. Gerçek iPhone ile test edin. Push için ücretli Apple Developer hesabı gerekir.
5. Swizzling kapalıysa `AppDelegate`'te APNs token'ını elle FCM'e verin (Firebase dokümanı).

---

## 5. Kod iskeleti

### 5.1 `main.dart`: başlatma ve arka plan handler

```dart
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'firebase_options.dart';

// Arka plan / kapalı durumdaki veri mesajları için. Üst düzey (top-level) fonksiyon olmalı;
// ayrı bir isolate'ta çalışır, uygulamanın bellek durumuna erişemez.
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  // Notification (başlıklı) mesajları sistem gösterir; burada yalnızca veri mesajı işlenir.
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
  runApp(const AltinKasamApp());
}
```

React Native karşılığı: `expo-notifications` ön plan handler'ı (`setNotificationHandler`) ve
`getLastNotificationResponseAsync`. Flutter'da arka plan işleyicisi **ayrı bir isolate**'tır; bu
kavram RN'de yoktur.

### 5.2 `NotificationsService`

```dart
import 'dart:io' show Platform;
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

const _channel = AndroidNotificationChannel(
  'price-alarms', 'Fiyat alarmları',
  importance: Importance.high,
);

class NotificationsService {
  final _fcm = FirebaseMessaging.instance;
  final _local = FlutterLocalNotificationsPlugin();

  Future<void> init(void Function(String path) onOpen) async {
    await _local.initialize(
      const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        iOS: DarwinInitializationSettings(),
      ),
      onDidReceiveNotificationResponse: (r) {
        final path = r.payload;
        if (path != null && path.startsWith('/')) onOpen(path);
      },
    );
    await _local
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(_channel);

    // iOS ön planda banner göster (RN'deki setNotificationHandler'ın karşılığı).
    await _fcm.setForegroundNotificationPresentationOptions(
      alert: true, badge: false, sound: true,
    );

    // Android ön planda FCM bildirimi kendiliğinden görünmez: yerel bildirim olarak göster.
    FirebaseMessaging.onMessage.listen((m) {
      final n = m.notification;
      if (n == null || !Platform.isAndroid) return;
      _local.show(
        m.hashCode, n.title, n.body,
        NotificationDetails(
          android: AndroidNotificationDetails(_channel.id, _channel.name, importance: Importance.high),
        ),
        payload: m.data['path'] as String?,
      );
    });

    // Arka plandan dokunma ve kapalıdan dokunma.
    FirebaseMessaging.onMessageOpenedApp.listen((m) => _open(m, onOpen));
    final initial = await _fcm.getInitialMessage();
    if (initial != null) _open(initial, onOpen);
  }

  void _open(RemoteMessage m, void Function(String) onOpen) {
    final path = m.data['path'];
    if (path is String && path.startsWith('/')) onOpen(path);
  }

  /// İzin yoksa ister. Reddedilirse false.
  Future<bool> ensurePermission() async {
    final s = await _fcm.requestPermission(alert: true, badge: true, sound: true);
    if (Platform.isAndroid) {
      await _local
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.requestNotificationsPermission(); // Android 13+
    }
    return s.authorizationStatus == AuthorizationStatus.authorized ||
        s.authorizationStatus == AuthorizationStatus.provisional;
  }

  /// RN'deki getPushToken karşılığı. İzin/yapılandırma yoksa null.
  Future<String?> getPushToken() async {
    try {
      if (Platform.isIOS) {
        // APNs token'ı hazır olmadan FCM token'ı alınamayabilir.
        final apns = await _fcm.getAPNSToken();
        if (apns == null) return null;
      }
      return await _fcm.getToken();
    } catch (_) {
      return null;
    }
  }

  Stream<String> get onTokenRefresh => _fcm.onTokenRefresh;

  Future<bool> present(String title, String body, String path) async {
    // Uygulama açıkken yerel bildirim (RN'deki present).
    await _local.show(
      DateTime.now().millisecondsSinceEpoch ~/ 1000, title, body,
      NotificationDetails(
        android: AndroidNotificationDetails(_channel.id, _channel.name, importance: Importance.high),
        iOS: const DarwinNotificationDetails(),
      ),
      payload: path,
    );
    return true;
  }
}
```

Dikkat: RN'de `getExpoPushTokenAsync` tek çağrıydı; Flutter'da iOS'ta **APNs token'ının hazır olmasını
beklemek** gerekir, bu sık görülen bir hatadır. `onTokenRefresh` dinlenip sunucuya yeniden eşitleme
yapılmalıdır (RN projesinde bu yoktur; bir eksiktir, bkz. bölüm 10).

### 5.3 `AlarmRepository` (AsyncStorage → SharedPreferences)

```dart
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class PriceAlarm {
  final String id, assetId, direction; // 'above' | 'below'
  final double target;
  final DateTime createdAt;
  final DateTime? triggeredAt;
  const PriceAlarm({required this.id, required this.assetId, required this.direction,
      required this.target, required this.createdAt, this.triggeredAt});

  PriceAlarm triggered(DateTime at) => PriceAlarm(
      id: id, assetId: assetId, direction: direction, target: target,
      createdAt: createdAt, triggeredAt: at);

  Map<String, dynamic> toJson() => {
        'id': id, 'assetId': assetId, 'direction': direction, 'target': target,
        'createdAt': createdAt.toIso8601String(),
        if (triggeredAt != null) 'triggeredAt': triggeredAt!.toIso8601String(),
      };
  factory PriceAlarm.fromJson(Map<String, dynamic> j) => PriceAlarm(
      id: j['id'], assetId: j['assetId'], direction: j['direction'],
      target: (j['target'] as num).toDouble(),
      createdAt: DateTime.parse(j['createdAt']),
      triggeredAt: j['triggeredAt'] == null ? null : DateTime.parse(j['triggeredAt']));
}

class AlarmRepository {
  static const _key = 'altin_kasam_alarms_v1';

  Future<List<PriceAlarm>> list() async {
    final p = await SharedPreferences.getInstance();
    final raw = p.getString(_key);
    if (raw == null) return [];
    return (jsonDecode(raw) as List).map((e) => PriceAlarm.fromJson(e)).toList();
  }

  Future<List<PriceAlarm>> _save(List<PriceAlarm> next) async {
    final p = await SharedPreferences.getInstance();
    await p.setString(_key, jsonEncode(next.map((a) => a.toJson()).toList()));
    return next;
  }

  Future<List<PriceAlarm>> add(PriceAlarm a) async => _save([...await list(), a]);
  Future<List<PriceAlarm>> remove(String id) async =>
      _save((await list()).where((a) => a.id != id).toList());
  Future<List<PriceAlarm>> markTriggered(List<String> ids, DateTime at) async =>
      _save((await list()).map((a) => ids.contains(a.id) ? a.triggered(at) : a).toList());

  /// Yalnızca saf mantık: kolayca birim test edilir.
  List<({PriceAlarm alarm, double price})> due(
      List<PriceAlarm> alarms, double? Function(String assetId) priceOf) {
    return [
      for (final a in alarms)
        if (a.triggeredAt == null)
          if (priceOf(a.assetId) case final price?)
            if (a.direction == 'above' ? price >= a.target : price <= a.target)
              (alarm: a, price: price),
    ];
  }
}
```

### 5.4 `AlarmSyncDatasource`

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class AlarmSyncDatasource {
  // --dart-define=ALARM_SYNC_URL=https://...   (EXPO_PUBLIC_ALARM_SYNC_URL karşılığı)
  static const _url = String.fromEnvironment('ALARM_SYNC_URL');
  bool get isEnabled => _url.isNotEmpty;

  Future<String> _installId() async {
    final p = await SharedPreferences.getInstance();
    var id = p.getString('altin_kasam_install_id_v1');
    if (id == null) {
      id = 'i${DateTime.now().microsecondsSinceEpoch.toRadixString(36)}'
          '${(DateTime.now().hashCode ^ identityHashCode(this)).toRadixString(36)}00000000';
      await p.setString('altin_kasam_install_id_v1', id);
    }
    return id; // Üretimde uuid paketi (Random.secure) tercih edin.
  }

  /// Hata/ağ yoksa null: alarmlar cihazda çalışmaya devam eder.
  Future<List<({String id, DateTime at})>?> sync(
      String pushToken, List<Map<String, dynamic>> alarms) async {
    if (!isEnabled) return null;
    try {
      final res = await http
          .post(Uri.parse(_url),
              headers: {'Content-Type': 'application/json'},
              body: jsonEncode({'installId': await _installId(), 'pushToken': pushToken, 'alarms': alarms}))
          .timeout(const Duration(seconds: 8));
      if (res.statusCode != 200) return null;
      final json = jsonDecode(res.body) as Map<String, dynamic>;
      return [
        for (final t in (json['triggered'] as List? ?? []))
          (id: t['id'] as String, at: DateTime.parse(t['at'] as String)),
      ];
    } catch (_) {
      return null;
    }
  }
}
```

Önemli: sunucu `pushToken` biçimini şu an `ExponentPushToken[...]` regex'iyle doğruluyor. Flutter'da FCM
token'ı gelecek; sunucunun bu doğrulaması ve gönderim yolu değişmelidir (bölüm 6).

### 5.5 `AlarmController` (Provider + ChangeNotifier)

`AlarmProvider.tsx` ile birebir aynı akış: `ready` bayrağı, `lastSynced` imzası, "önce işaretle sonra göster".

```dart
import 'package:flutter/widgets.dart';

class AlarmController extends ChangeNotifier with WidgetsBindingObserver {
  AlarmController(this._repo, this._notifications, this._sync);
  final AlarmRepository _repo;
  final NotificationsService _notifications;
  final AlarmSyncDatasource _sync;

  List<PriceAlarm> alarms = [];
  bool ready = false;            // RN'deki ready: açılış eşitlemesi bitene kadar yerel kontrol yok
  String _lastSynced = '';       // RN'deki lastSynced (useRef)
  final _inFlight = <String>{};  // RN'deki inFlight
  Map<String, double> prices = {};

  Future<void> init() async {
    WidgetsBinding.instance.addObserver(this);
    alarms = await _repo.list();
    notifyListeners();
    final updated = await _syncServer(alarms);   // sunucuda tetiklenenleri öğren
    if (updated != null) alarms = updated;
    ready = true;                                // artık yerel kontrol başlayabilir
    notifyListeners();
    _notifications.onTokenRefresh.listen((_) {
      _lastSynced = '';                          // token değişti: bir sonraki eşitlemede zorla gönder
      _syncServer(alarms);
    });
  }

  Future<List<PriceAlarm>?> _syncServer(List<PriceAlarm> list) async {
    if (!_sync.isEnabled) return null;
    final payload = _payload(list);
    final signature = payload.map((a) => '${a['id']}|${a['direction']}|${a['target']}').join(';');
    if (signature == _lastSynced) return null;
    final token = await _notifications.getPushToken();
    if (token == null) return null;
    final triggered = await _sync.sync(token, payload);
    if (triggered == null) return null;
    _lastSynced = signature;
    List<PriceAlarm>? next;
    for (final t in triggered) {
      next = await _repo.markTriggered([t.id], t.at);
    }
    return next;
  }

  List<Map<String, dynamic>> _payload(List<PriceAlarm> list) => [
        for (final a in list)
          if (a.triggeredAt == null)
            {...a.toJson(), 'label': labelOf(a.assetId), 'noun': 'alış', 'unit': 'try'},
      ];

  /// Fiyat her güncellendiğinde çağrılır (RN'de useEffect'in bağımlılığı `prices`).
  Future<void> onPrices(Map<String, double> next) async {
    prices = next;
    if (!ready) return;
    final due = _repo.due(alarms, (id) => prices[id])
        .where((d) => !_inFlight.contains(d.alarm.id)).toList();
    if (due.isEmpty) return;
    _inFlight.addAll(due.map((d) => d.alarm.id));
    try {
      alarms = await _repo.markTriggered(due.map((d) => d.alarm.id).toList(), DateTime.now());
      notifyListeners();
      for (final d in due) {
        await _notifications.present(
            '${labelOf(d.alarm.assetId)} Alarmı Tetiklendi', 'Güncel Fiyat ${d.price.toStringAsFixed(2)}', '/');
      }
    } finally {
      _inFlight.removeAll(due.map((d) => d.alarm.id));
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // AppState karşılığı: resumed olunca fiyat yoklamasını sürdür, paused'ta durdur.
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }
}

String labelOf(String assetId) => assetId; // alarm_assets.dart ile değiştirin
```

Bağlama (Provider):

```dart
runApp(MultiProvider(
  providers: [ChangeNotifierProvider(create: (_) => AlarmController(repo, notifications, sync)..init())],
  child: const AltinKasamApp(),
));
```

Riverpod kullanırsanız `AlarmController` bir `AsyncNotifier<List<PriceAlarm>>` olur; `ready` bayrağı
`AsyncValue.loading` durumuyla örtüşür.

### 5.6 Yönlendirme (go_router) ve bildirime dokunma

```dart
final router = GoRouter(routes: [
  GoRoute(path: '/', builder: (_, __) => const MarketScreen()),
  GoRoute(path: '/alarm', builder: (_, s) =>
      AlarmScreen(assetId: s.uri.queryParameters['assetId'])),
]);

// Bildirime dokununca:
notifications.init((path) => router.go(path));
```

### 5.7 UI iskeleti

```dart
class AlarmScreen extends StatelessWidget {
  const AlarmScreen({super.key, this.assetId});
  final String? assetId;
  @override
  Widget build(BuildContext context) {
    final c = context.watch<AlarmController>();
    return Scaffold(
      appBar: AppBar(title: const Text('Fiyat alarmı')),
      body: ListView(children: [
        for (final a in c.alarms.where((a) => a.triggeredAt == null))
          ListTile(title: Text(a.assetId), subtitle: Text('${a.direction} ${a.target}')),
      ]),
    );
  }
}
```

---

## 6. Sunucu tarafında değişenler

Mevcut Cloud Functions büyük ölçüde aynı kalır; iki yer değişir.

### 6.1 `syncAlarms`: token doğrulaması

```ts
// Eski: /^Expo(nent)?PushToken\[.+\]$/
// Yeni (FCM): uzun, URL-güvenli karakterlerden oluşan bir dizi
if (!isText(pushToken, 4096) || pushToken.length < 100) { res.status(400).json({ error: 'token' }); return; }
```
FCM token uzunluğu ve biçimi sürümle değişebilir; sıkı regex yerine uzunluk/karakter kümesi doğrulayın.

### 6.2 `checkAlarms`: Expo Push yerine FCM

```ts
import { getMessaging } from 'firebase-admin/messaging';

await getMessaging().send({
  token: alarm.pushToken,
  notification: {
    title: `${alarm.label} Alarmı Tetiklendi`,
    body: `Güncel Fiyat ${formatValue(price)}`,
  },
  data: { path: '/' },
  android: { priority: 'high', notification: { channelId: 'price-alarms', sound: 'default' } },
  apns: { payload: { aps: { sound: 'default' } } },
});
```
- Çoklu gönderim: `sendEach` / `sendEachForMulticast` (en çok 500 token).
- Ölü token: hata kodu `messaging/registration-token-not-registered` → o token'ın alarmlarını silin
  (Expo'daki `DeviceNotRegistered` karşılığı).
- Expo ile FCM'yi **birlikte** desteklemek mümkündür: token biçimine bakıp (`ExponentPushToken` ise Expo,
  değilse FCM) yolu seçersiniz. RN ve Flutter istemcileri aynı sunucuyu kullanabilir.

### 6.3 Değişmeyenler

`alarm-values` ucu, Hasfiyat önbelleği, Firestore şeması, zamanlayıcı mantığı, `triggeredAt` ile idempotency
**aynen** kalır. Sunucu istemciden bağımsız tasarlandığı için taşınabilirlik yüksektir.

---

## 7. Arka plan ve kapalı durum davranışı

| Durum | Flutter'da ne olur |
| --- | --- |
| Ön plan | `onMessage` akışı tetiklenir. iOS'ta `setForegroundNotificationPresentationOptions` ile sistem gösterir; **Android'de siz yerel bildirimle gösterirsiniz** |
| Arka plan | "Notification" içeren mesajı sistem gösterir. Dokununca `onMessageOpenedApp` |
| Kapalı | Aynı şekilde sistem gösterir. Dokununca `getInitialMessage()` açılışta okunmalı |
| Veri-only mesaj | `onBackgroundMessage` top-level handler'ı **ayrı isolate**'ta çalışır; iOS bunu agresif kısıtlar, güvenilirliğe güvenmeyin |

Bu projede mesaj "notification" türündedir (başlık + gövde); bu en güvenilir türdür ve kapalıyken
sistem tarafından gösterilir. Veri-only mesaja geçmek istemeyin: iOS'ta sessiz push garantisizdir.

Android: `force-stop` edilmiş uygulama FCM almaz (RN'deki gibi). iOS: kullanıcı uygulamayı kaydırarak
kapatırsa **sessiz (data-only)** push'lar teslim edilmez; görünür bildirimler gelir.

---

## 8. Derleme, yayın, ortam değişkenleri

| Konu | RN / Expo | Flutter |
| --- | --- | --- |
| Android paketi | `eas build` / `gradlew bundleRelease` | `flutter build appbundle` |
| iOS paketi | `eas build --platform ios` | `flutter build ipa` (Mac + Xcode şart) |
| Bulut derleme | EAS Build | Codemagic, GitHub Actions (macOS runner), Bitrise |
| İmza yönetimi | EAS Credentials | Xcode otomatik imza, Fastlane `match`, Play App Signing |
| Mağazaya yükleme | `eas submit` | `fastlane` / Transporter / Play Console |
| OTA | EAS Update | Yerleşik yok; Shorebird gibi araçlar |
| Ortam değişkeni | `EXPO_PUBLIC_*` (EAS env) | `--dart-define-from-file=env/prod.json`, flavors |
| Sır | Pakete **girmemeli** | Aynı kural: `--dart-define` değerleri paketten **çıkarılabilir** |

`--dart-define` değerleri uygulama ikilisinde bulunur; RN'deki `EXPO_PUBLIC_*` gibi sır koymayın.

---

## 9. Test

| Katman | Flutter |
| --- | --- |
| Saf mantık (`due`) | `flutter_test` birim test |
| Repository | `SharedPreferences.setMockInitialValues` |
| Controller | `mocktail`/`mockito` ile sahte servisler |
| Widget | `testWidgets` |
| Uçtan uca | `integration_test`, Firebase Emulator (sunucu için) |
| Gerçek push | Gerçek cihaz + FCM konsolu "Test mesajı" ya da sunucuya elle alarm ekleme |

Örnek birim test:

```dart
test('above: fiyat hedefi geçince tetiklenir', () {
  final a = PriceAlarm(id: '1', assetId: 'gram-24', direction: 'above', target: 6500,
      createdAt: DateTime(2026));
  final due = AlarmRepository().due([a], (_) => 6501);
  expect(due.length, 1);
});
```

---

## 10. Flutter ekibi için dikkat edilecekler

1. **iOS APNs token zamanlaması:** `getToken()` APNs token'ı hazır olmadan başarısız olabilir; yeniden deneme/bekleme ekleyin.
2. **Token yenilenmesi:** `onTokenRefresh` dinleyin ve sunucuya yeniden eşitleyin. (RN projesinde bu eksiktir ve bir iyileştirme adayıdır.)
3. **Android ön plan:** FCM bildirimi ön planda kendiliğinden görünmez; `flutter_local_notifications` ile gösterin.
4. **Top-level handler:** `onBackgroundMessage` yalnızca üst düzey fonksiyon olabilir ve `@pragma('vm:entry-point')` ister. Release derlemede (tree shaking) unutulursa çalışmaz.
5. **Ayrı isolate:** Arka plan handler'ı ana isolate'ın belleğine erişemez; paylaşılan duruma `SharedPreferences`/dosya ile ulaşın (ve `reload()` çağırın).
6. **Çoklu platform yapılandırma dosyaları** (`google-services.json`, `GoogleService-Info.plist`) git'e girmemeli ya da bilinçli yönetilmelidir.
7. **Paket sürümleri:** Firebase paketleri birlikte güncellenir; `flutter pub outdated` ve changelog okuyun.
8. **Platform kanalları:** Bazı yetenekler (WidgetKit, özel bildirim sesi) native kod gerektirir; iOS için Swift, Android için Kotlin bilen biri gerekir.
9. **Sır yönetimi, geriye dönük uyumluluk, idempotency, gizlilik** konuları RN ile birebir aynıdır (bkz. eğitim belgesi bölüm 9).
10. **Mağaza formları:** FCM token ve alarm verisi için App Privacy / Data safety güncellenmeli.

---

## 11. Mülakat soruları (Flutter tarafı)

1. **Flutter nasıl çizer?** Kendi motoruyla (Impeller/Skia) her pikseli çizer; platform widget'larını sarmalamaz. RN native görünümler kullanır.
2. **Widget, Element, RenderObject farkı?** Widget değişmez tanım, Element ağaçtaki örnek ve yaşam döngüsü, RenderObject yerleşim ve çizim.
3. **`StatelessWidget` ile `StatefulWidget`?** Durum tutan ve `setState` ile yeniden çizen sınıf; yaşam döngüsü `initState/dispose`.
4. **State yönetimi seçenekleri ve ödünleşimleri?** setState, InheritedWidget/Provider, Riverpod, Bloc. Bu projedeki Context+Provider yapısı `provider`/Riverpod'a eşlenir.
5. **`async/await`, `Future`, `Stream` ve isolate farkı?** Dart tek iş parçacıklı olay döngüsüdür; ağır iş için isolate (ayrı bellek).
6. **FCM'de notification ve data mesajı?** Notification'ı sistem gösterir; data-only'yi uygulama işler (arka planda güvenilmez).
7. **Arka plan mesaj handler'ı neden top-level?** Ayrı isolate'ta çalıştığı için kapanışlara bağlı olamaz.
8. **Android'de ön planda bildirim nasıl gösterilir?** `onMessage` + `flutter_local_notifications`.
9. **iOS'ta push için gerekenler?** APNs anahtarı (Firebase'e), Push Notifications capability, Background Modes, gerçek cihaz.
10. **`shared_preferences` güvenli mi?** Hayır; sır için `flutter_secure_storage`.
11. **`go_router` ile derin bağlantı?** Rota tanımı + platform `intent-filter`/Universal Links, `app_links`.
12. **Flutter'da OTA güncelleme var mı?** Yerleşik değil; Shorebird gibi araçlar, mağaza kuralları dikkate alınarak.
13. **`--dart-define` ile `.env` farkı?** Derleme zamanı sabiti; ikiliye gömülür, sır değildir.
14. **Flavor nedir?** Ortam başına (dev/prod) ayrı yapılandırma, uygulama kimliği, Firebase projesi.
15. **React Native'e göre ne zaman Flutter?** Bölüm 12.
16. **Performans: jank nasıl bulunur?** DevTools, `--profile` modu, gereksiz yeniden çizim, `const` widget, `ListView.builder`.

---

## 12. Hangi platformu ne zaman seçmeli?

| Ölçüt | React Native / Expo | Flutter |
| --- | --- | --- |
| Ekip yetkinliği | JS/TS, React bilenler | Dart öğrenmeye açık ekipler |
| UI tutarlılığı | Platformun doğal görünümü | Her yerde aynı piksel, özel tasarım |
| OTA güncelleme | EAS Update (kolay) | Üçüncü taraf |
| Native modül ekosistemi | Geniş (npm), Expo modülleri | Geniş (pub.dev), Firebase resmi destek güçlü |
| Web/masaüstü | react-native-web (olgun) | Flutter web/desktop (farklı ödünleşimler) |
| Ağır grafik/animasyon | Reanimated/Skia ile mümkün | Yerleşik güçlü |
| Bildirim altyapısı | Expo Push ile basit | FCM doğrudan, daha fazla native kurulum |
| Sunucu paylaşımı | TS ile sunucu/istemci kod paylaşımı (bu projede `hasfiyatPriceMap.ts`) | Dart sunucu mümkün ama JS ekosistemi daha yaygın |

Bu projede RN/Expo'nun öne çıkan yönleri: sunucu ve istemcinin **TypeScript kodunu paylaşması**
(`hasfiyatPriceMap.ts`), EAS ile imza/derleme/ortam yönetimi ve OTA. Flutter'ın öne çıkacağı yerler:
tamamen özel arayüz, tutarlı animasyon ve Firebase ile derin entegrasyon.

---

## Ek: tek bakışta uçtan uca kontrol listesi (Flutter)

- [ ] `flutterfire configure` çalıştı, iki platform dosyası yerinde
- [ ] iOS: Push Notifications + Background Modes, APNs `.p8` Firebase'de
- [ ] Android 13+ izni (`POST_NOTIFICATIONS`) ve kanal oluşturuluyor
- [ ] `getToken()` iOS'ta APNs hazır olduktan sonra çağrılıyor
- [ ] `onTokenRefresh` sunucuya eşitliyor
- [ ] Ön plan (Android) için yerel bildirim gösterimi var
- [ ] `getInitialMessage` ve `onMessageOpenedApp` bağlı, yol doğrulanıyor
- [ ] Sunucu FCM v1 ile gönderiyor, ölü token temizleniyor
- [ ] "Önce işaretle sonra gönder" ve `ready` bayrağı korundu
- [ ] Sırlar paketten ve git'ten uzak
- [ ] Gerçek Android ve iPhone'da, uygulama kapalıyken denendi
