const programs=[
 {id:1,title:"일상 속 AI 도구 활용 입문",category:"교육",tags:["AI","디지털","교육"],audience:"성인",fee:"무료",district:"종로구",date:"2026.12.03 – 12.17",place:"종로구 교육문화센터",source:"서울 교육정보 예시",symbol:"✦",bg:"#e5efe4",desc:"생성형 AI와 일상에서 활용할 수 있는 디지털 도구를 알아보는 입문 과정입니다. 본 데이터는 화면 테스트용 예시입니다."},
 {id:2,title:"가족과 함께하는 주말 그림책 시간",category:"독서",tags:["독서","어린이","가족"],audience:"가족",fee:"무료",district:"마포구",date:"2026.12.06",place:"마포구립 문화공간",source:"서울 공개모집 예시",symbol:"▤",bg:"#f3e7d6",desc:"보호자와 어린이가 함께 그림책을 읽고 이야기와 놀이를 나누는 프로그램 예시입니다."},
 {id:3,title:"처음 만나는 수채화: 색과 표현",category:"문화예술",tags:["미술","수채화","체험"],audience:"성인",fee:"유료",district:"성동구",date:"2026.12.10 – 12.24",place:"성동구 문화공간",source:"프로그램 샘플",symbol:"◒",bg:"#e8e5f5",desc:"수채화의 기초 표현과 색 혼합을 체험하는 초보자 과정 예시입니다."},
 {id:4,title:"청소년 진로 탐색 워크숍",category:"청소년",tags:["진로","청소년","교육"],audience:"청소년",fee:"무료",district:"강서구",date:"2026.12.12",place:"강서구 청소년 공간",source:"서울 공개모집 예시",symbol:"↗",bg:"#dceaf2",desc:"다양한 직업과 진로 선택에 대해 탐색하는 워크숍의 샘플 정보입니다."},
 {id:5,title:"도시와 건축, 서울을 걷다",category:"체험",tags:["건축","도시","문화"],audience:"누구나",fee:"무료",district:"중구",date:"2026.12.13",place:"서울 도심 일대",source:"프로그램 샘플",symbol:"⌂",bg:"#f0e6d9",desc:"서울의 건축과 도시 공간을 함께 살펴보는 도보 프로그램 예시입니다."},
 {id:6,title:"작은 음악회: 겨울의 선율",category:"공연·전시",tags:["음악","공연","문화예술"],audience:"누구나",fee:"유료",district:"용산구",date:"2026.12.19",place:"용산 문화시설",source:"문화정보 예시",symbol:"♫",bg:"#f4e0e4",desc:"지역 문화시설에서 진행되는 소규모 음악 공연을 가정한 샘플입니다."},
 {id:7,title:"스마트폰 사진 기초와 편집",category:"교육",tags:["사진","스마트폰","디지털"],audience:"성인",fee:"무료",district:"노원구",date:"2026.12.20 – 12.27",place:"노원구 교육 공간",source:"프로그램 샘플",symbol:"▣",bg:"#e1eee9",desc:"스마트폰으로 사진을 촬영하고 기본 편집을 익히는 강좌 예시입니다."},
 {id:8,title:"겨울방학 과학 만들기 체험",category:"체험",tags:["과학","어린이","체험"],audience:"어린이",fee:"유료",district:"송파구",date:"2026.12.28",place:"송파구 체험 공간",source:"서울 공개모집 예시",symbol:"⚙",bg:"#e7edf7",desc:"어린이 대상 과학 원리를 체험하는 만들기 활동의 샘플입니다."},
 {id:9,title:"퇴근 후 인문학 읽기 모임",category:"독서",tags:["독서","인문학","성인"],audience:"성인",fee:"무료",district:"은평구",date:"2026.12.30",place:"은평구 도서공간",source:"프로그램 샘플",symbol:"¶",bg:"#efe9d8",desc:"책과 일상 주제를 바탕으로 함께 읽고 생각을 나누는 모임 예시입니다."}
];
const $=id=>document.getElementById(id);
const grid=$("programGrid"), count=$("resultCount"), empty=$("emptyState");
function filtered(){
 const q=$("keyword").value.trim().toLowerCase(), cat=$("category").value, aud=$("audience").value, fee=$("fee").value, district=$("district").value;
 return programs.filter(p=>(!q||[p.title,p.category,p.tags.join(" "),p.place,p.desc].join(" ").toLowerCase().includes(q))&&(!cat||p.category===cat)&&(!aud||p.audience===aud)&&(!fee||p.fee===fee)&&(!district||p.district===district));
}
function render(){
 const list=filtered();count.textContent=list.length+"개 프로그램";
 grid.innerHTML=list.map(p=>`<article class="program-card" tabindex="0" role="button" data-id="${p.id}"><div class="card-visual" style="--card-bg:${p.bg}"><span class="visual-symbol">${p.symbol}</span><span class="card-chip">${p.audience}</span></div><div class="card-body"><div class="card-category">${p.category} · ${p.district}</div><h3 class="card-title">${p.title}</h3><div class="card-meta"><span>◷ ${p.date}</span><span>⌖ ${p.place}</span></div><div class="card-bottom"><span class="fee">${p.fee}</span><span class="source">예시 데이터</span></div></div></article>`).join("");
 empty.classList.toggle("hidden",list.length!==0);grid.classList.toggle("hidden",list.length===0);
}
function showDetail(id){
 const p=programs.find(x=>x.id===Number(id));if(!p)return;
 $("detailContent").innerHTML=`<span class="demo-label">테스트용 샘플 데이터</span><h2 class="detail-title">${p.title}</h2><div class="detail-meta"><span>분야: ${p.category}</span><span>대상: ${p.audience}</span><span>비용: ${p.fee}</span><span>일정: ${p.date}</span><span>장소: ${p.place}</span><span>데이터 출처: ${p.source}</span></div><p class="detail-description">${p.desc}</p><p class="detail-description">실제 API 연결 후 원본 정보와 신청 페이지 링크가 표시될 예정입니다.</p>`;
 $("detailDialog").showModal();
}
grid.addEventListener("click",e=>{const card=e.target.closest(".program-card");if(card)showDetail(card.dataset.id)});
grid.addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&e.target.matches(".program-card")){e.preventDefault();showDetail(e.target.dataset.id)}});
["keyword","category","audience","fee","district"].forEach(id=>$(id).addEventListener(id==="keyword"?"input":"change",render));
$("searchBtn").addEventListener("click",render);$("keyword").addEventListener("keydown",e=>{if(e.key==="Enter")render()});
function reset(){["keyword","category","audience","fee","district"].forEach(id=>$(id).value="");render()}
$("reset").addEventListener("click",reset);$("emptyReset").addEventListener("click",reset);$("closeDialog").addEventListener("click",()=>$("detailDialog").close());
$("detailDialog").addEventListener("click",e=>{if(e.target===$("detailDialog"))$("detailDialog").close()});
document.querySelectorAll("[data-tag]").forEach(b=>b.addEventListener("click",()=>{$("keyword").value=b.dataset.tag;render()}));
render();
