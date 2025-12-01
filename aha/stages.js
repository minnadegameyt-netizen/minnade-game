export const stages = [
    // --- お題1: 野球 ---
    {
        id: "baseball",
        base_image: "images/baseball_base.webp",
        changes: [
            {
                change_image: "images/baseball_q1.webp",
                correct_answer: "UFOが出現した",
                dummy_answers: ["ボールがカボチャになった", "バックが猫になった", "空の色が変わった"]
            },
            {
                change_image: "images/baseball_q2.webp",
                correct_answer: "ボールがカボチャになった",
                dummy_answers: ["UFOが出現した", "バックが猫になった", "グローブの色が変わった"]
            },
            {
                change_image: "images/baseball_q3.webp",
                correct_answer: "バックが猫になった",
                dummy_answers: ["UFOが出現した", "ボールがカボチャになった", "選手の帽子が変わった"]
            },
            {
                change_image: "images/baseball_q4.webp",
                correct_answer: "バックが消えた",
                dummy_answers: ["UFOが出現した", "ボールがカボチャになった", "グローブの色が変わった"]
            }
        ]
    },

    // --- お題2: エレベーターの猫 ---
    {
        id: "cat",
        base_image: "images/cat_base.webp",
        changes: [
            {
                change_image: "images/cat_q1.webp",
                correct_answer: "扉が閉まった",
                dummy_answers: ["床の色が変わった", "監視カメラがついた", "猫が2匹になった"]
            },
            {
                change_image: "images/cat_q2.webp",
                correct_answer: "床の色が黄色になった",
                dummy_answers: ["猫の耳の色が変わった", "監視カメラがついた", "猫のヒゲが長くなった"]
            },
            {
                change_image: "images/cat_q3.webp",
                correct_answer: "後ろに男が現れた",
                dummy_answers: ["床の色が変わった", "猫の耳の色が変わった", "エレベーターのボタンが増えた"]
            },
            {
                change_image: "images/cat_q4.webp",
                correct_answer: "後ろに柴犬が現れた",
                dummy_answers: ["床の色が変わった", "監視カメラがついた", "猫の耳の色が変わった"]
            }
        ]
    },

    // --- お題3: 街中の男性グループ ---
    {
        id: "friends",
        base_image: "images/friends_base.webp",
        changes: [
            {
                change_image: "images/friends_q1.webp",
                correct_answer: "左端の男の髪型が変わった",
                dummy_answers: ["右端の男性の髪型が変わった", "背景のバスの色が変わった", "全員の身長が変わった"]
            },
            {
                change_image: "images/friends_q2.webp",
                correct_answer: "左から2番目の男性の服の色が変わった",
                dummy_answers: ["左端の男の髪型が変わった", "背景の建物の色が変わった", "道路の模様が変わった"]
            },
            {
                change_image: "images/friends_q3.webp",
                correct_answer: "男の数が増えた",
                dummy_answers: ["右端の男性の髪型が変わった", "左から2番目の男性の服の色が変わった", "中央の男性のズボンが変わった"]
            },
            {
                change_image: "images/friends_q4.webp",
                correct_answer: "郵便ポストが出た",
                dummy_answers: ["右端の男性の髪型が変わった", "背景のバスのが消えた", "左から2番目の男性の服の色が変わった"]
            }
        ]
    },

    // --- お題4: サバンナの馬 ---
    {
        id: "horse",
        base_image: "images/horse_base.webp",
        changes: [
            {
                change_image: "images/horse_q1.webp",
                correct_answer: "鳥が飛んでいる",
                dummy_answers: ["馬がシマウマになった", "サイが追加された", "空が夕焼けになった"]
            },
            {
                change_image: "images/horse_q2.webp",
                correct_answer: "チーターが現われた",
                dummy_answers: ["鳥が飛んでいる", "サイが追加された", "地面が砂漠になった"]
            },
            {
                change_image: "images/horse_q3.webp",
                correct_answer: "サイが追加された",
                dummy_answers: ["鳥が飛んでいる", "馬がシマウマになった", "木の種類が変わった"]
            },
            {
                change_image: "images/horse_q4.webp",
                correct_answer: "木や山が消えた",
                dummy_answers: ["馬の色が変わった", "サイが追加された", "馬がシマウマになった"]
            }
        ]
    },

    // --- お題5: 黒子のいる和室 ---
    {
        id: "kuroko",
        base_image: "images/kuroko_base.webp",
        changes: [
            {
                change_image: "images/kuroko_q1.webp",
                correct_answer: "掛け軸が消えた",
                dummy_answers: ["壺が現れた", "黒子のポーズが変わった", "畳の色が変わった"]
            },
            {
                change_image: "images/kuroko_q2.webp",
                correct_answer: "襖が消えた",
                dummy_answers: ["掛け軸の文字が変わった", "壺が現れた", "障子の模様が変わった"]
            },
            {
                change_image: "images/kuroko_q3.webp",
                correct_answer: "壺が現れた",
                dummy_answers: ["黒子のポーズが変わった", "掛け軸の文字が変わった", "黒子がいなくなった"]
            },
            {
                change_image: "images/kuroko_q4.webp",
                correct_answer: "黒子がお面をつけた",
                dummy_answers: ["壺が現れた", "黒子のポーズが変わった", "掛け軸の文字が変わった"]
            }
        ]
    },

    // --- お題6: 腕が伸びる男 ---
    {
        id: "luffy",
        base_image: "images/luffy_base.webp",
        changes: [
            {
                change_image: "images/luffy_q1.webp",
                correct_answer: "麦わら帽子を被っている",
                dummy_answers: ["服の色が変わった", "殴られた男の性別が変わった", "腕の長さが変わった"]
            },
            {
                change_image: "images/luffy_q2.webp",
                correct_answer: "ゴミ箱が現われた",
                dummy_answers: ["床の模様が変わった", "赤い服の男性が消えた", "車が現れた"]
            },
            {
                change_image: "images/luffy_q3.webp",
                correct_answer: "赤い服の男性になった",
                dummy_answers: ["床の模様が変わった", "車が現れた", "腕の長さが変わった"]
            },
            {
                change_image: "images/luffy_q4.webp",
                correct_answer: "車が現れた",
                dummy_answers: ["床の模様が変わった", "赤い服の男性になった", "腕の長さが変わった"]
            }
        ]
    },
    
    // --- お題7: 号泣会見 ---
    {
        id: "press",
        base_image: "images/press_base.webp",
        changes: [
            {
                change_image: "images/press_q1.webp",
                correct_answer: "ネクタイの色が赤になった",
                dummy_answers: ["背景にポスターが現れた", "背景が紫色になった", "牛乳を飲んでいる"]
            },
            {
                change_image: "images/press_q2.webp",
                correct_answer: "背景にポスターが現れた",
                dummy_answers: ["ネクタイの色が赤になった", "背景が紫色になった", "牛乳を飲んでいる"]
            },
            {
                change_image: "images/press_q3.webp",
                correct_answer: "背景が紫色になった",
                dummy_answers: ["ネクタイの色が赤になった", "背景にポスターが現れた", "牛乳を飲んでいる"]
            },
            {
                change_image: "images/press_q4.webp",
                correct_answer: "給食が現われた",
                dummy_answers: ["ネクタイの色が赤になった", "背景にポスターが現れた", "背景が紫色になった"]
            }
        ]
    },
    
    // --- お題8: 女の子の部屋 ---
    {
        id: "room",
        base_image: "images/room_base.webp",
        changes: [
            {
                change_image: "images/room_q1.webp",
                correct_answer: "ポスターが消えた",
                dummy_answers: ["窓の外に鳥がいる", "ベッドが質素になった", "ポスターの絵柄が変わった"]
            },
            {
                change_image: "images/room_q2.webp",
                correct_answer: "鳥が現われた",
                dummy_answers: ["枕元のぬいぐるみが変わった", "ベッドが質素になった", "壁の色が変わった"]
            },
            {
                change_image: "images/room_q3.webp",
                correct_answer: "ぬいぐるみが消えた",
                dummy_answers: ["窓の外に鳥がいる", "ゲーム機が変わった", "部屋の電気が消えた"]
            },
            {
                change_image: "images/room_q4.webp",
                correct_answer: "ゲーム機が消えた",
                dummy_answers: ["窓の外に鳥がいる", "ベッドが質素になった", "枕元のぬいぐるみが変わった"]
            }
        ]
    },

    // --- お題9: 野獣先輩 ---
    {
        id: "yaju",
        base_image: "images/yaju_base.webp",
        changes: [
            {
                change_image: "images/yaju_q1.webp",
                correct_answer: "Tシャツの色がピンクになった",
                dummy_answers: ["ソファに誰もいなくなった", "後ろに別の人物が現れた", "短パンの色が変わった"]
            },
            {
                change_image: "images/yaju_q2.webp",
                correct_answer: "ソファに誰もいなくなった",
                dummy_answers: ["Tシャツの色がピンクになった", "後ろに別の人物が現れた", "壁の色が変わった"]
            },
            {
                change_image: "images/yaju_q3.webp",
                correct_answer: "後ろに別の人物が現れた",
                dummy_answers: ["Tシャツの色がピンクになった", "ソファに誰もいなくなった", "ソファの布が無くなった"]
            },
            {
                change_image: "images/yaju_q4.webp",
                correct_answer: "髪型が変わった",
                dummy_answers: ["Tシャツの色がピンクになった", "後ろに別の人物が現れた", "ソファに誰もいなくなった"]
            }
        ]
    }
];