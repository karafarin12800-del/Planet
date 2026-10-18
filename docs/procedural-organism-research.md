# گزارش پژوهش و طراحی: مولد رویه‌ای سه‌بعدی موجودات Planet

تاریخ بررسی: 2026-10-18  
شاخهٔ توسعه: `feature/procedural-organism-3d`

## خلاصهٔ تصمیم‌ها

این گزارش یک نقشهٔ منابعِ اولیه برای طراحی موتور است و فهرست ۷۰+ منبع معتبر یا مرجع فنی مرتبط را گرد می‌آورد. برخی صفحات رسمی/مشخصات برای فهم قرارداد فنی بررسی شده‌اند و منابع پژوهشی برای مرور ادبیات و تعیین محدودیت‌ها غربال شده‌اند؛ این گزارش ادعا نمی‌کند که هر منبع به‌صورت مقاله‌به‌مقاله و تمام‌متن بازبینی شده باشد.

1. **ژنوم خام، فنوتیپ و مدل هندسی سه چیز متفاوت‌اند.** پیش‌بینی شکل بدن از توالی خام نیازمند شناسایی ژن‌ها، عملکرد پروتئین، تنظیم ژن، زمان و مکان بیان، تکوین، فیزیولوژی، مکانیک بافت و محیط است. نگاشت مستقیم «یک رشتهٔ DNA → شکل دقیق بدن» علمی نیست. منابعی دربارهٔ شبکه‌های تنظیمی تکوین، چنداثری بودن ژن‌ها و پلاستیسیتهٔ فنوتیپی این محدودیت را پشتیبانی می‌کنند: [Wagner & Zhang, 2011](https://www.nature.com/articles/nrg2949)، [Fusco & Minelli, 2010](https://pmc.ncbi.nlm.nih.gov/articles/PMC2817147/)، [Sommer, 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7198268/).

2. **ژنوم مرجع نباید بی‌صدا به یک ژنوم جعلی تبدیل شود.** RefSeq/GenBank، NCBI Gene/BLAST، UniProt و منابع دامنه/خانوادهٔ پروتئینی برای شواهد و annotation مناسب‌اند. در نسخهٔ فعلی Planet، پروژهٔ واردشده می‌تواند به پروکسی آموزشی ۱۶۸ bp نگاشته شود؛ بنابراین نام، شناسه و شواهد ورودی حفظ می‌شود، اما هندسه باید «فرضیهٔ دیداری» برچسب بخورد، نه بازسازی فنوتیپ واقعی. خطوط لولهٔ NCBI برای annotation از هم‌ترازی و پیش‌بینی ژن استفاده می‌کنند؛ دریافت توالی به‌تنهایی معادل annotation نیست ([PGAP](https://www.ncbi.nlm.nih.gov/refseq/annotation_prok/)، [Eukaryotic Annotation Pipeline](https://www.ncbi.nlm.nih.gov/refseq/annotation_euk/process/)، [RefSeq](https://www.ncbi.nlm.nih.gov/refseq/)).

3. **فسیل و گونه‌های زنده نقش شواهد متفاوت دارند.** برای دایناسورهای منقرض‌شده، آناتومی از استخوان، ردپا، فسیل‌های پوشش بدن، مقایسهٔ تبارشناختی و آنالوگ‌های امروزی استنباط می‌شود؛ DNA عملیاتیِ قابل اتکا برای ساخت ژنوم دایناسورها در دست نیست. در نتیجه فرم‌های منقرض‌شده باید با درجهٔ اطمینان و منبع بازسازی شوند ([NPS—Fossil Record](https://www.nps.gov/subjects/fossils/dinosaurs.htm)، [PeerJ—Dinosaur paleohistology review](https://peerj.com/articles/7764/)).

4. **مدل سه‌بعدی در زمان اجرا ساخته می‌شود.** موتور جدید پارامترهای فنوتیپی موجود را به هندسهٔ چندضلعیِ حجمی تبدیل می‌کند و فایل GLB با رأس‌ها، نرمال‌ها، شاخص‌های مثلث، متریال و یادداشت منشأ می‌سازد. glTF 2.0/GLB یک قالب انتشار دارایی سه‌بعدی زمان‌اجراست؛ ساخت یک فایل معتبر به معنی صحت زیستی هندسه نیست ([Khronos glTF 2.0](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html)، [glTF Validator](https://github.com/KhronosGroup/glTF-Validator)).

5. **محیط باید بقا و رشد را در شبیه‌ساز تغییر دهد.** دما، آب، شوری، اکسیژن، منابع غذایی، زیستگاه و فشارهای بوم‌شناختی می‌توانند متغیرهای ورودی مدل باشند. رابطهٔ عددی آن‌ها با هر صفت باید پارامترگذاری و اعتبارسنجی شود، نه حدس‌زدن ادعای علمی ([GBIF](https://www.gbif.org/what-is-gbif)، [IUCN Red List](https://www.iucnredlist.org/)، [Mesa](https://mesa.readthedocs.io/stable/)).

## آنچه در این شاخه پیاده‌سازی شده است

- `procedural-organism-3d.js`: مش‌های چندضلعی رویه‌ای برای فرم‌های اصلی (میکروب، ماهی، حشره، پرنده، مهره‌داران، دایناسور، گیاه/درخت و قارچ).
- پیش‌نمایش چرخان در پنجرهٔ جدید درون خود برنامه؛ انتخاب از آرشیو گونه‌های شبیه‌سازی.
- ذخیرهٔ مدل تولیدشده در قالب **GLB / glTF 2.0**.
- متادیتای منشأ و هشدار علمی داخل فایل و رابط کاربری.
- `PlanetLifeAPI.getSpeciesSnapshot()` برای خواندن امن ویژگی‌های آرشیو گونه‌ها از رابط موجود.
- تغییر نام کش Service Worker و افزودن موتور به پوستهٔ آفلاین.
- افزودن آزمون‌های هندسه، ایندکس‌ها، مواد، ساختار GLB، محدودهٔ بافرها و caveat علمی به CI اندروید.

## مواردی که هنوز «ادعای تکمیل» نمی‌شوند

- این موتور فعلاً **تولید هندسهٔ سه‌بعدی رویه‌ای** است، نه پیش‌بینی علمیِ فنوتیپ از کل ژنوم.
- نگاشت واردات مرجع به پروکسی ۱۶۸ bp همچنان محدودیت موجود سیستم است؛ نباید آن را ژنوم واقعیِ فرد فرض کرد.
- ظاهر و هندسه فعلاً مش سبک و کم‌جزئیات است؛ UV، بافت پوست مبتنی بر بافت‌شناسی، اسکلت/ریگ حرفه‌ای، گام‌برداری زیست‌مکانیکی، مدل‌سازی جنین و قیود رشد واقعی مرحله‌های بعدی‌اند.
- ساخت APK و نتیجهٔ آزمون CI پس از بازشدن PR باید در GitHub بررسی شوند. تا پیش از آن، نباید فایل را build موفق یا آمادهٔ انتشار نامید.
- برای اعتبارسنجی ساختاری پیشرفتهٔ GLB، CI باید از اعتبارسنج رسمی Khronos یا آزمون هم‌ارز استفاده کند؛ آزمون داخلی موجود جای داوری زیستی یا اعتبارسنج کامل استاندارد را نمی‌گیرد.

## فهرست ۷۸ منبع و مرجع برای طراحی و راستی‌آزمایی

### الف) نگاشت ژنوتیپ–فنوتیپ، تکوین و پلاستیسیته

1. [The pleiotropic structure of the genotype–phenotype map](https://www.nature.com/articles/nrg2949) — Nature Reviews Genetics؛ چنداثری بودن ژن و پیچیدگی نگاشت.
2. [Phenotypic plasticity in development and evolution](https://pmc.ncbi.nlm.nih.gov/articles/PMC2817147/) — Philosophical Transactions B؛ پاسخ فنوتیپ به محیط.
3. [Phenotypic Plasticity: From Theory and Genetics to Current and Future Challenges](https://pmc.ncbi.nlm.nih.gov/articles/PMC7198268/) — Genetics؛ سازوکارها و محدودیت‌های پلاستیسیته.
4. [From pattern to process: understanding organismal form](https://pmc.ncbi.nlm.nih.gov/articles/PMC6538285/) — تکوین، شبکه‌های تنظیمی و مکانیک بافت.
5. [The role of phenotypic plasticity in driving genetic evolution](https://pmc.ncbi.nlm.nih.gov/articles/PMC1691402/) — پلاستیسیته و تکامل.
6. [Relaxed Genetic Constraint Is Ancestral to the Evolution of Phenotypic Plasticity](https://pmc.ncbi.nlm.nih.gov/articles/PMC3381942/) — زمینهٔ ژنتیکی پلاستیسیته.
7. [The locus of evolution: evo devo and the genetics of adaptation](https://pubmed.ncbi.nlm.nih.gov/17456002/) — ژنتیک سازگاری و زیست‌شناسی تکوینی.
8. [Evolution and development of shape: integrating quantitative approaches](https://www.nature.com/articles/nrg2829) — اندازه‌گیری و تغییر شکل.
9. [Written in stone: fossils, genes and evo-devo](https://www.nature.com/articles/nrg2225) — ادغام فسیل، ژن و تکوین.
10. [Gene regulatory networks and animal development](https://pubmed.ncbi.nlm.nih.gov/16109876/) — شبکه‌های تنظیمی در رشد جانوران.
11. [Gene Ontology Annotations](http://geneontology.org/docs/go-annotations/) — اصطلاحات و کدهای شواهد عملکرد ژن.
12. [NCBI Gene](https://www.ncbi.nlm.nih.gov/gene/) — رکوردهای ژنی.
13. [NCBI BLAST](https://blast.ncbi.nlm.nih.gov/Blast.cgi) — شباهت توالی، نه پیش‌بینی مستقیم شکل بدن.
14. [UniProt](https://www.uniprot.org/) — اطلاعات و annotation پروتئین.
15. [InterPro](https://www.ebi.ac.uk/interpro/) — خانواده‌ها، دامنه‌ها و امضاهای پروتئینی.

### ب) ژنوم‌ها، annotation، پروتئین و داده‌های زیستی

16. [NCBI RefSeq](https://www.ncbi.nlm.nih.gov/refseq/) — توالی‌های مرجع ژنوم، RNA و پروتئین.
17. [GenBank Overview](https://www.ncbi.nlm.nih.gov/genbank/) — آرشیو توالی‌های ارسالی.
18. [NCBI Prokaryotic Genome Annotation Pipeline](https://www.ncbi.nlm.nih.gov/refseq/annotation_prok/) — annotation ژنوم پروکاریوت‌ها.
19. [NCBI Eukaryotic Genome Annotation Pipeline](https://www.ncbi.nlm.nih.gov/refseq/annotation_euk/process/) — annotation یوکاریوت‌ها.
20. [NCBI Datasets](https://www.ncbi.nlm.nih.gov/datasets/) — بسته‌های ژنوم و فراداده.
21. [NCBI Genome Data Viewer](https://www.ncbi.nlm.nih.gov/gdv/) — مشاهدهٔ ژنوم و annotation.
22. [NCBI Nucleotide](https://www.ncbi.nlm.nih.gov/nuccore/) — رکوردهای نوکلئوتیدی.
23. [NCBI Protein](https://www.ncbi.nlm.nih.gov/protein/) — رکوردهای پروتئین.
24. [NCBI Conserved Domain Database](https://www.ncbi.nlm.nih.gov/Structure/cdd/cdd.shtml) — دامنه‌های حفاظت‌شده.
25. [NCBI SRA](https://www.ncbi.nlm.nih.gov/sra) — داده‌های خام توالی‌یابی.
26. [NCBI GEO](https://www.ncbi.nlm.nih.gov/geo/) — داده‌های بیان ژن و آزمایش‌های عملکردی.
27. [European Nucleotide Archive](https://www.ebi.ac.uk/ena/browser/home) — آرشیو توالی‌ها و داده‌های نوکلئوتیدی.
28. [ENA Programmatic Access](https://ena-docs.readthedocs.io/en/latest/retrieval/programmatic-access.html) — دریافت ماشینی داده.
29. [Ensembl](https://www.ensembl.org/) — ژنوم، ژن و annotation گونه‌های متعدد.
30. [Ensembl Comparative Genomics](https://www.ensembl.org/info/genome/compara/index.html) — مقایسهٔ ژنوم و تبارشناسی.
31. [OrthoDB](https://www.orthodb.org/) — گروه‌های ژنی ارتولوگ.
32. [eggNOG](https://eggnog.embl.de/) — گروه‌های ارتولوگ و annotation عملکردی.
33. [Pfam](https://pfam.xfam.org/) — خانواده‌ها و دامنه‌های پروتئینی.
34. [RCSB Protein Data Bank](https://www.rcsb.org/) — ساختارهای سه‌بعدی مولکولی، نه مدل کامل جاندار.
35. [AlphaFold Protein Structure Database](https://alphafold.ebi.ac.uk/) — ساختارهای پیش‌بینی‌شدهٔ پروتئین.
36. [AlphaFold Database FAQ](https://alphafold.ebi.ac.uk/faq) — حدود تفسیر و استفاده از ساختارهای پیش‌بینی‌شده.
37. [FlyBase](https://flybase.org/) — ژنتیک و زیست‌شناسی مگس میوه.
38. [WormBase](https://wormbase.org/) — مدل‌های ژنتیکی نماتود.
39. [ZFIN](https://zfin.org/) — دادهٔ زیستی گورخرماهی.
40. [Mouse Genome Informatics](https://www.informatics.jax.org/) — دانش ژنتیکی موش.
41. [The Arabidopsis Information Resource (TAIR)](https://www.arabidopsis.org/) — ژنوم و زیست‌شناسی گیاهی.
42. [FASTA format reference](https://www.ncbi.nlm.nih.gov/genbank/fastaformat/) — قالب ورودی توالی.
43. [Darwin Core](https://dwc.tdwg.org/) — واژگان استاندارد داده‌های تنوع زیستی.

### ج) فسیل، دیرین‌زیست‌شناسی و گونه‌ها

44. [National Park Service: Dinosaurs and the Fossil Record](https://www.nps.gov/subjects/fossils/dinosaurs.htm) — فسیل به‌عنوان شاهد مستقیم تاریخ حیات.
45. [National Park Service: Fossils](https://www.nps.gov/subjects/fossils/index.htm) — انواع شواهد فسیلی.
46. [Smithsonian: Dinosaurs](https://naturalhistory.si.edu/education/teaching-resources/paleontology) — منابع موزه‌ای دیرین‌شناسی.
47. [American Museum of Natural History: Dinosaurs](https://www.amnh.org/exhibitions/permanent/dinosaurs) — نمونه‌ها و بازسازی‌های موزه‌ای.
48. [Royal Tyrrell Museum](https://tyrrellmuseum.com/) — مجموعه و پژوهش فسیلی.
49. [Do morphometric data improve phylogenetic reconstruction?](https://pmc.ncbi.nlm.nih.gov/articles/PMC11487705/) — اهمیت انتخاب صفات و سنجش ریخت‌شناختی؛ صفحهٔ مجله/مقاله برای یافتن نسخهٔ دقیق.
50. [Dinosaur paleohistology: review and trends](https://peerj.com/articles/7764/) — ریزساختار استخوان و شواهد رشد.
51. [The Origin and Evolution of Dinosaurs](https://www.annualreviews.org/content/journals/10.1146/annurev.earth.25.1.435) — مرجع مرور تاریخ تکاملی دایناسورها؛ صفحهٔ ناشر.
52. [Progress and future directions in dinosaur palaeontology](https://www.nature.com/articles/s44358-026-00191-9) — مرور حوزهٔ دیرین‌شناسی دایناسورها؛ صفحهٔ ناشر.
53. [Natural History Museum: Fossils](https://www.nhm.ac.uk/discover/fossils.html) — مفاهیم شواهد فسیلی.
54. [IUCN Red List](https://www.iucnredlist.org/) — ارزیابی گونه‌ها، زیستگاه و تهدیدها.
55. [GBIF: What is GBIF?](https://www.gbif.org/what-is-gbif) — ثبت حضور گونه‌ها در زمان و مکان.
56. [GBIF Data Publishing](https://www.gbif.org/data-publishing) — کیفیت، استانداردسازی و منشأ داده.
57. [GBIF Primary Biodiversity Data](https://docs.gbif.org/course-introduction-to-gbif/en/primary-biodiversity-data.html) — رکوردهای وقوع و ملاحظات تفسیری.

### د) بوم‌شناسی، تکامل جمعیت و شبیه‌سازی عامل‌محور

58. [Mesa Documentation](https://mesa.readthedocs.io/stable/) — چارچوب شبیه‌سازی عامل‌محور.
59. [Mesa Getting Started](https://mesa.readthedocs.io/stable/getting_started.html) — عامل، محیط و رفتارهای جمعی.
60. [NetLogo Documentation](https://ccl.northwestern.edu/netlogo/docs/) — مدل‌سازی عامل‌محور و بوم‌شناسی.
61. [OpenStax Biology 2e: Evolution and Population Genetics](https://openstax.org/details/books/biology-2e) — رانش ژنتیکی، انتخاب طبیعی و فرضیات جمعیت.
62. [Gaps and opportunities in modelling human influence on species distributions](https://www.nature.com/articles/s41559-024-02435-3) — مدل‌سازی توزیع گونه‌ها و محدودیت‌ها.
63. [Anthropogenic range contractions bias species climate change forecasts](https://www.nature.com/articles/s41558-018-0089-x) — محدودیت پیش‌بینی جابه‌جایی زیستگاه.
64. [Darwin, On the Origin of Species (Project Gutenberg)](https://www.gutenberg.org/ebooks/1228) — متن تاریخی نظریهٔ انتخاب طبیعی؛ منبع تاریخی است، نه جایگزین ادبیات مدرن.
65. [Understanding Evolution — UC Berkeley](https://evolution.berkeley.edu/) — آموزش انتخاب طبیعی و شواهد تکامل.

### هـ) مش سه‌بعدی، قالب فایل و اعتبارسنجی

66. [Khronos glTF 2.0 Specification](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html) — قرارداد فایل و GLB.
67. [Khronos glTF Registry](https://registry.khronos.org/glTF/) — نسخه‌ها و افزونه‌های استاندارد.
68. [Khronos glTF Validator](https://github.com/KhronosGroup/glTF-Validator) — اعتبارسنجی ساختار فایل.
69. [glTF Validator online tool](https://github.khronos.org/glTF-Validator/) — بررسی دستی فایل خروجی.
70. [Three.js GLTFExporter](https://threejs.org/docs/pages/GLTFExporter.html) — صادرات صحنه به glTF/GLB.
71. [Three.js BufferGeometry](https://threejs.org/docs/pages/BufferGeometry.html) — رأس، نرمال، شاخص، رنگ و گروه مواد.
72. [Three.js MeshStandardMaterial](https://threejs.org/docs/pages/MeshStandardMaterial.html) — مواد فیزیکی‌مبنا.
73. [MDN: WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices) — حافظه و عملکرد گرافیک وب.
74. [Open3D Triangle Mesh](https://www.open3d.org/docs/release/tutorial/geometry/mesh.html) — بررسی اتصال، manifold، watertight و self-intersection.
75. [CGAL Polygon Mesh Processing](https://doc.cgal.org/latest/Polygon_mesh_processing/) — عملیات اصلاح، مثلث‌بندی و پردازش مش.
76. [Blender Manual: Meshes](https://docs.blender.org/manual/en/latest/modeling/meshes/index.html) — ساختار مش و ابزارهای مدل‌سازی.
77. [Khronos glTF Tutorial](https://github.khronos.org/glTF-Tutorials/) — صحنه‌ها، گره‌ها، مش‌ها و بافرها.
78. [MDN: WebGL API](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API) — محدودیت‌ها و API گرافیکی مرورگر.

## قاعدهٔ استفاده از منابع در موتور

- منابع ژنومی برای **توالی، شناسایی ژن، هم‌ترازی، annotation و عملکرد مولکولی** به کار می‌روند؛ یک توالی FASTA تنها به‌خودی‌خود مجموعهٔ صفات آناتومیک نیست.
- منابع فسیلی و تبارشناختی برای **قیود هندسهٔ فرم‌های منقرض‌شده** استفاده می‌شوند؛ هر حدس دربارهٔ بافت نرم، رنگ یا رفتار باید با درجهٔ اطمینان مشخص شود.
- داده‌های GBIF و IUCN برای **پراکنش و زیستگاه** سرنخ‌اند؛ رخداد مکانی به‌تنهایی ثابت نمی‌کند یک گونه در هر شرایطی می‌تواند زنده بماند.
- منابع glTF و اعتبارسنجی مش فقط **درستی فنی فایل و هندسه** را بررسی می‌کنند، نه صحت زیستی شکل.

## معیار پذیرش فنی

- مدل‌های متفاوت واقعاً هندسهٔ متفاوت بسازند و مختصات/نرمال/شاخص‌ها معتبر باشند.
- همان شناسه و ورودی یکسان، هندسهٔ تکرارپذیر بدهد.
- فایل GLB سربرگ، JSON، بافرها، مش‌ها و مواد سازگار با glTF 2.0 داشته باشد؛ خروجی باید با اعتبارسنج رسمی نیز آزموده شود.
- اپ موبایل فایل را درون برنامه بسازد و کاربر بتواند مدل را ذخیره کند.
- هیچ پیام رابط کاربری مدعی «بازسازی دقیق فنوتیپ از DNA خام» نباشد.
- CI سبز و APK ساخته‌شده قبل از اعلام آمادگی انتشار بررسی شوند.
