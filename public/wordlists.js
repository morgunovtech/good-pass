// Passphrase word lists: six themes in each interface language, 80 words a
// theme, no word twice inside a theme. generator.js takes the list of the
// current language; the theme names are in public/locales/.
export const WORDLISTS = {
  ru: {
    default: [
      'Гроза','Пламя','Ветер','Облако','Скала','Река','Волна','Искра','Замок','Мост',
      'Тропа','Озеро','Медведь','Орёл','Тигр','Сова','Звезда','Луна','Солнце','Комета',
      'Якорь','Маяк','Парус','Кедр','Шторм','Лавина','Бриз','Туман','Рассвет','Закат',
      'Утёс','Вершина','Сапфир','Рубин','Янтарь','Кристалл','Гранит','Опал','Тополь','Клён',
      'Витязь','Крепость','Дозор','Гавань','Ворон','Пантера','Дельфин','Ястреб','Буря','Пурга',
      'Метель','Ручей','Утро','Поляна','Роща','Ущелье','Каньон','Обрыв','Плато','Перевал',
      'Оазис','Степь','Тайга','Саванна','Прерия','Фьорд','Лагуна','Архипелаг','Айсберг','Вулкан',
      'Молния','Радуга','Полярис','Зенит','Надир','Экватор','Меридиан','Горизонт','Рубеж','Страж'
    ],
    nature: [
      'Дуб','Берёза','Сосна','Ель','Ива','Вяз','Ясень','Бук','Липа','Каштан',
      'Ромашка','Роза','Лилия','Фиалка','Подсолнух','Лаванда','Мак','Тюльпан','Орхидея','Ирис',
      'Родник','Водопад','Ледник','Залив','Пролив','Дельта','Устье','Исток','Порог','Каскад',
      'Дождь','Снег','Град','Иней','Роса','Листопад','Цветение','Прилив','Отлив','Засуха',
      'Гром','Вихрь','Ураган','Тайфун','Смерч','Муссон','Пассат','Циклон','Бора','Мистраль',
      'Коралл','Агат','Жемчуг','Малахит','Топаз','Аметист','Изумруд','Нефрит','Обсидиан','Базальт',
      'Магма','Глина','Песок','Мрамор','Сланец','Кварц','Слюда','Кремень','Мел','Пемза',
      'Мох','Папоротник','Лишайник','Хвоя','Камыш','Тростник','Плющ','Лиана','Бамбук','Баобаб'
    ],
    space: [
      'Галактика','Туманность','Квазар','Пульсар','Нейтрон','Протон','Фотон','Плазма','Орбита','Затмение',
      'Меркурий','Венера','Марс','Юпитер','Сатурн','Уран','Нептун','Плутон','Церера','Эрида',
      'Сириус','Вега','Альтаир','Денеб','Бетельгейзе','Ригель','Антарес','Капелла','Альдебаран','Арктур',
      'Андромеда','Орион','Кассиопея','Персей','Цефей','Лира','Лебедь','Стрелец','Скорпион','Близнецы',
      'Астероид','Болид','Метеор','Апогей','Перигей','Зенит','Эклиптика','Сингулярность','Горизонт','Аккреция',
      'Космонавт','Скафандр','Телескоп','Спутник','Ракета','Шаттл','Стыковка','Невесомость','Вакуум','Ионосфера',
      'Сверхновая','Красный','Белый','Карлик','Гигант','Нейтронная','Чёрная','Дыра','Кольцо','Спираль',
      'Реголит','Кратер','Риголь','Каллисто','Европа','Титан','Ганимед','Тритон','Харон','Ио'
    ],
    food: [
      'Пирог','Борщ','Каша','Блин','Пельмень','Вареник','Сырник','Кулебяка','Расстегай','Окрошка',
      'Яблоко','Вишня','Слива','Груша','Персик','Абрикос','Малина','Клюква','Смородина','Черника',
      'Корица','Ваниль','Шафран','Имбирь','Мускат','Базилик','Тимьян','Розмарин','Кардамон','Куркума',
      'Мёд','Масло','Сливки','Творог','Кефир','Ряженка','Сметана','Простокваша','Айран','Кумыс',
      'Хлеб','Багет','Круассан','Чиабатта','Лаваш','Каравай','Калач','Бублик','Пончик','Крендель',
      'Миндаль','Фундук','Грецкий','Кешью','Фисташка','Арахис','Кокос','Каштан','Кедровый','Пекан',
      'Чай','Кофе','Какао','Компот','Морс','Кисель','Сбитень','Квас','Лимонад','Смузи',
      'Тыква','Свёкла','Морковь','Репа','Редис','Капуста','Огурец','Томат','Перец','Баклажан'
    ],
    animals: [
      'Барсук','Бобр','Выдра','Горностай','Соболь','Куница','Норка','Хорёк','Ласка','Песец',
      'Рысь','Пума','Леопард','Гепард','Ягуар','Лев','Волк','Лис','Шакал','Койот',
      'Фламинго','Пеликан','Цапля','Аист','Журавль','Альбатрос','Буревестник','Чайка','Баклан','Пингвин',
      'Кондор','Грифон','Беркут','Сокол','Коршун','Лунь','Канюк','Пустельга','Филин','Неясыть',
      'Дельфин','Касатка','Нарвал','Белуга','Морж','Тюлень','Ламантин','Акула','Скат','Мурена',
      'Хамелеон','Игуана','Варан','Кобра','Питон','Удав','Гадюка','Гекон','Тритон','Аксолотль',
      'Мустанг','Аппалуза','Бизон','Зубр','Як','Лось','Олень','Косуля','Антилопа','Газель',
      'Колибри','Иволга','Щегол','Снегирь','Свиристель','Зяблик','Дрозд','Скворец','Жаворонок','Соловей'
    ],
    mythology: [
      'Перун','Велес','Сварог','Даждьбог','Стрибог','Мокошь','Лада','Ярило','Хорс','Симаргл',
      'Зевс','Афина','Аполлон','Артемида','Гермес','Гефест','Арес','Посейдон','Деметра','Дионис',
      'Один','Тор','Локи','Фрейя','Бальдр','Хеймдалль','Тюр','Браги','Идунн','Скади',
      'Анубис','Осирис','Исида','Гор','Тот','Ра','Сехмет','Баст','Нут','Маат',
      'Феникс','Грифон','Единорог','Дракон','Василиск','Химера','Минотавр','Кентавр','Сфинкс','Гидра',
      'Мьёльнир','Экскалибур','Эгида','Трезубец','Гунгнир','Каладболг','Дуриндана','Кусанаги','Ваджра','Нарсил',
      'Олимп','Асгард','Вальхалла','Авалон','Шамбала','Беловодье','Ирий','Эльдорадо','Атлантида','Лемурия',
      'Валькирия','Берсерк','Амазонка','Титан','Циклоп','Нимфа','Сирена','Наяда','Дриада','Сильфида'
    ]
  },
  en: {
    default: [
      'Storm','Flame','Wind','Cloud','Rock','River','Wave','Spark','Castle','Bridge',
      'Trail','Lake','Bear','Owl','Star','Moon','Comet','Anchor','Beacon','Sail',
      'Cedar','Tempest','Avalanche','Breeze','Fog','Dawn','Sunset','Cliff','Summit','Sapphire',
      'Ruby','Amber','Crystal','Granite','Opal','Poplar','Maple','Knight','Fortress','Sentry',
      'Harbor','Raven','Lynx','Hawk','Gale','Blizzard','Snowfall','Brook','Morning','Meadow',
      'Grove','Gorge','Canyon','Ridge','Plateau','Glacier','Oasis','Steppe','Taiga','Savanna',
      'Prairie','Fjord','Lagoon','Island','Iceberg','Volcano','Lightning','Rainbow','Polaris','Zenith',
      'Nadir','Equator','Meridian','Horizon','Frontier','Guardian','Compass','Lantern','Harvest','Ember'
    ],
    nature: [
      'Oak','Birch','Pine','Spruce','Willow','Elm','Ash','Beech','Linden','Chestnut',
      'Daisy','Rose','Lily','Violet','Lavender','Poppy','Tulip','Orchid','Iris','Aster',
      'Spring','Waterfall','Bay','Strait','Delta','Estuary','Rapids','Cascade','Creek','Inlet',
      'Rain','Snow','Hail','Frost','Dew','Autumn','Bloom','Tide','Ebb','Drought',
      'Squall','Whirlwind','Hurricane','Typhoon','Tornado','Monsoon','Tradewind','Cyclone','Mistral','Sirocco',
      'Coral','Agate','Pearl','Malachite','Topaz','Amethyst','Emerald','Jade','Obsidian','Basalt',
      'Magma','Clay','Sand','Marble','Slate','Quartz','Mica','Flint','Chalk','Pumice',
      'Moss','Fern','Lichen','Thistle','Reed','Bracken','Ivy','Bamboo','Baobab','Clover'
    ],
    space: [
      'Galaxy','Nebula','Quasar','Pulsar','Neutron','Proton','Photon','Plasma','Orbit','Eclipse',
      'Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto','Ceres','Eris',
      'Sirius','Vega','Altair','Deneb','Betelgeuse','Rigel','Antares','Capella','Aldebaran','Arcturus',
      'Andromeda','Orion','Cassiopeia','Perseus','Cepheus','Lyra','Cygnus','Pegasus','Aquila','Centaurus',
      'Rocket','Shuttle','Station','Probe','Rover','Lander','Capsule','Module','Satellite','Telescope',
      'Meteor','Asteroid','Meteorite','Cosmos','Vacuum','Gravity','Spectrum','Redshift','Supernova','Corona',
      'Titan','Europa','Ganymede','Callisto','Io','Triton','Phobos','Deimos','Charon','Enceladus',
      'Astronaut','Cosmonaut','Orbiter','Launch','Countdown','Payload','Airlock','Booster','Starlight','Lightyear'
    ],
    food: [
      'Bread','Bagel','Muffin','Pretzel','Waffle','Pancake','Croissant','Biscuit','Scone','Toast',
      'Mango','Papaya','Lemon','Lime','Cherry','Plum','Peach','Pear','Grape','Melon',
      'Banana','Kiwi','Fig','Quince','Apricot','Guava','Lychee','Coconut','Pomegranate','Raspberry',
      'Carrot','Potato','Tomato','Onion','Garlic','Radish','Pumpkin','Turnip','Celery','Spinach',
      'Basil','Thyme','Cumin','Saffron','Paprika','Nutmeg','Vanilla','Cinnamon','Oregano','Clove',
      'Honey','Cocoa','Caramel','Toffee','Fudge','Nougat','Praline','Marzipan','Truffle','Sorbet',
      'Pasta','Risotto','Noodle','Dumpling','Taco','Burrito','Sushi','Ramen','Curry','Pilaf',
      'Yogurt','Cream','Kefir','Brie','Gouda','Feta','Cheddar','Mozzarella','Ricotta','Tofu'
    ],
    animals: [
      'Badger','Beaver','Otter','Ermine','Sable','Marten','Mink','Ferret','Weasel','Wolverine',
      'Lynx','Puma','Leopard','Cheetah','Jaguar','Lion','Wolf','Fox','Jackal','Coyote',
      'Flamingo','Pelican','Heron','Stork','Crane','Albatross','Petrel','Gull','Cormorant','Penguin',
      'Condor','Osprey','Kite','Harrier','Buzzard','Kestrel','Vulture','Goshawk','Kingfisher','Puffin',
      'Orca','Narwhal','Beluga','Walrus','Seal','Manatee','Shark','Stingray','Moray','Octopus',
      'Chameleon','Iguana','Komodo','Cobra','Python','Boa','Viper','Gecko','Newt','Axolotl',
      'Bison','Yak','Moose','Deer','Antelope','Gazelle','Zebra','Giraffe','Camel','Llama',
      'Hummingbird','Oriole','Goldfinch','Bullfinch','Waxwing','Chaffinch','Thrush','Starling','Lark','Nightingale'
    ],
    mythology: [
      'Perun','Veles','Svarog','Dazhbog','Stribog','Mokosh','Lada','Yarilo','Khors','Simargl',
      'Zeus','Athena','Apollo','Artemis','Hermes','Hephaestus','Ares','Poseidon','Demeter','Dionysus',
      'Odin','Thor','Loki','Freya','Baldur','Heimdall','Tyr','Bragi','Idun','Skadi',
      'Anubis','Osiris','Isis','Horus','Thoth','Ra','Sekhmet','Bastet','Nut','Maat',
      'Griffin','Unicorn','Wyvern','Basilisk','Chimera','Minotaur','Centaur','Sphinx','Hydra','Kraken',
      'Mjolnir','Excalibur','Aegis','Trident','Gungnir','Caladbolg','Durendal','Kusanagi','Vajra','Narsil',
      'Olympus','Asgard','Valhalla','Avalon','Shambhala','Belovodye','Iriy','Eldorado','Atlantis','Lemuria',
      'Valkyrie','Berserker','Amazon','Titan','Cyclops','Nymph','Siren','Naiad','Dryad','Sylph'
    ]
  }
};

// Verbs that link the words into a picture for the mnemonic tip.
export const MNEMONIC_ACTIONS = {
  ru: ['обрушилась на', 'летит к', 'зовёт', 'сияет рядом с', 'защищает', 'встречает'],
  en: ['crashes into', 'flies to', 'calls', 'shines next to', 'guards', 'meets']
};
