# Интерактивные карты от BroskiPlay

Репозиторий с интерактивными картами игровых миров. [Главная страница проекта](https://broskiplay.ru/).

## Stellar Blade — готово

В проект перенесены все девять карт локаций Stellar Blade:

- [Эйдос 7](stellar-blade-map/eidos7.html)
- [Ксион](stellar-blade-map/xion.html)
- [Пустошь](stellar-blade-map/wasteland.html)
- [Атлесс Левуар](stellar-blade-map/altess_levoire.html)
- [Матрица 11](stellar-blade-map/matrix11.html)
- [Великая пустыня](stellar-blade-map/great_desert.html)
- [Бездна Левуар](stellar-blade-map/abyss_levoire.html)
- [Шпиль 4](stellar-blade-map/spire4.html)
- [Эйдос 9](stellar-blade-map/eidos9.html)

## Возможности

- **Отметки и фильтры.** Отмечайте найденное кнопкой в карточке метки или правой кнопкой мыши. Переключайте категории и следите за прогрессом по каждой из них.
- **Права доступа.** Посетители могут добавлять собственные метки и вести прогресс. Управление общей базой и её экспорт доступны создателю карты после входа через Google.
- **Локальное сохранение.** Прогресс и пользовательские метки сохраняются в браузере. Прогресс можно импортировать и экспортировать как JSON; создатель может экспортировать общую базу меток для публикации в репозитории.
- **Синхронизация Firebase.** После входа через Google личные отметки и пользовательские метки синхронизируются через Cloud Firestore между устройствами. При отсутствии сети данные остаются локально; синхронизация повторяется после восстановления соединения.

## Управление

| Действие | Как выполнить |
| --- | --- |
| Найти метку | Введите название или описание в строку поиска |
| Отметить найденное | Нажмите метку правой кнопкой мыши или кнопку в её карточке |
| Переместить общую метку | Войдите в аккаунт создателя, затем зажмите `Ctrl` и перетащите её левой кнопкой мыши |
| Добавить собственную метку | Включите режим добавления и нажмите на нужное место карты |
| Скрыть категорию | Нажмите на её название в списке фильтров |

## Настройка Firebase

Личные метки и прогресс хранятся в `users/{uid}`. Чтобы пользователи могли синхронизировать их только со своими аккаунтами, опубликуйте [firestore.rules](stellar-blade-map/firestore.rules) в проекте Firebase `broskiplaymaps` через Firebase Console → Firestore Database → Rules. Не заменяйте правила в проекте, если в них есть другие нужные приложению разрешения.

## Запуск локально

Проект не требует сборки: это статические HTML-, CSS- и JavaScript-файлы. Чтобы браузер мог загружать JSON-базы через `fetch`, запустите HTTP-сервер из корня репозитория:

```bash
python3 -m http.server 8000
```

Затем откройте [http://localhost:8000](http://localhost:8000/). Для Google-входа домен сайта должен быть разрешён в настройках Firebase Authentication. Firebase и Leaflet загружаются с внешних CDN, поэтому для их работы требуется подключение к интернету.

## Технологии

- HTML5, CSS3 и JavaScript без фреймворков
- [Leaflet.js](https://leafletjs.com/) и `L.CRS.Simple`
- Firebase Authentication и Cloud Firestore
- GitHub Pages

## Ссылки

- [Главная страница проекта](https://broskiplay.ru/)
- [README проекта Stellar Blade](stellar-blade-map/README.md)
- [Twitch: BroskiPlay](https://www.twitch.tv/broskiplay)
- [YouTube: BroskiPlay](https://youtube.com/@broskiplayt)
- [Поддержать проект на DonationAlerts](https://www.donationalerts.com/r/broskiplay)
## Безопасность Firebase

Firebase Web API key **не является паролем**: он неизбежно виден браузеру работающего сайта. Защищать нужно не скрытием ключа, а ограничениями проекта:

1. В Google Cloud Console ограничьте ключ по HTTP referrer только `https://broskiplay.ru/*` и `https://www.broskiplay.ru/*` (для локальной разработки добавьте localhost отдельно).
2. В API restrictions оставьте только API, которые нужны Firebase (как минимум Identity Toolkit API и Cloud Firestore API).
3. В Firebase Authentication разрешите только нужные домены и Google-провайдера.
4. Опубликуйте [правила Firestore](stellar-blade-map/firestore.rules) из репозитория.
5. Если ключ уже попал в публичный репозиторий или сторонние логи, смените его в Google Cloud Console после настройки ограничений. Это не заменяет правила Firestore.

Рабочий ключ не хранится в Git: перед локальным запуском или деплоем скопируйте `firebase-config.example.js` в `firebase-config.js` и заполните значениями проекта. Файл `firebase-config.js` добавлен в `.gitignore`.
