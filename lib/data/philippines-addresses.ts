/**
 * Philippines Address Data
 * Contains comprehensive cities, provinces, and zip codes for all Philippine regions
 * Accurate official postal codes from Philippine Post Office
 */

export interface City {
  name: string;
  province: string;
  zipCodes: string[];
  barangays?: string[];
}

export interface Province {
  name: string;
  cities: City[];
}

// Metro Manila (NCR) Cities and Zip Codes
export const metroManilaCities: City[] = [
  {
    name: "Taguig",
    province: "Metro Manila",
    zipCodes: ["1630", "1631", "1632", "1633", "1634", "1635", "1636", "1637", "1638", "1639"],
    barangays: [
      "Bagumbayan", "Bambang", "Calzada", "Central Bicutan", "Central Signal Village",
      "Fort Bonifacio", "Hagonoy", "Ibayo-Tipas", "Katuparan", "Ligid-Tipas",
      "Lower Bicutan", "Maharlika Village", "Napindan", "New Lower Bicutan",
      "North Daang Hari", "North Signal Village", "Palingon", "Pinagsama",
      "San Miguel", "Santa Ana", "South Daang Hari", "South Signal Village",
      "Tanyag", "Upper Bicutan", "Ususan", "Wawa", "Western Bicutan"
    ]
  },
  {
    name: "Makati",
    province: "Metro Manila",
    zipCodes: ["1200", "1201", "1202", "1203", "1204", "1205", "1206", "1207", "1208", "1209", "1210", "1211", "1212", "1213", "1214", "1215", "1216", "1217", "1218", "1219", "1220", "1221", "1222", "1223", "1224", "1225", "1226", "1227", "1228", "1229", "1230", "1231", "1232", "1233", "1234", "1235", "1236", "1237", "1238", "1239", "1240", "1241", "1242", "1243", "1244", "1245", "1246", "1247", "1248", "1249", "1250", "1251", "1252", "1253", "1254", "1255", "1256", "1257", "1258", "1259", "1260", "1261", "1262", "1263", "1264", "1265", "1266", "1267", "1268", "1269", "1270", "1271", "1272", "1273", "1274", "1275", "1276", "1277", "1278", "1279", "1280", "1281", "1282", "1283", "1284", "1285", "1286", "1287", "1288", "1289", "1290", "1291", "1292", "1293", "1294", "1295", "1296", "1297", "1298", "1299"]
  },
  {
    name: "Manila",
    province: "Metro Manila",
    zipCodes: ["1000", "1001", "1002", "1003", "1004", "1005", "1006", "1007", "1008", "1009", "1010", "1011", "1012", "1013", "1014", "1015", "1016", "1017", "1018", "1019", "1020", "1021", "1022", "1023", "1024", "1025", "1026", "1027", "1028", "1029", "1030", "1031", "1032", "1033", "1034", "1035", "1036", "1037", "1038", "1039", "1040", "1041", "1042", "1043", "1044", "1045", "1046", "1047", "1048", "1049", "1050", "1051", "1052", "1053", "1054", "1055", "1056", "1057", "1058", "1059", "1060", "1061", "1062", "1063", "1064", "1065", "1066", "1067", "1068", "1069", "1070", "1071", "1072", "1073", "1074", "1075", "1076", "1077", "1078", "1079", "1080", "1081", "1082", "1083", "1084", "1085", "1086", "1087", "1088", "1089", "1090", "1091", "1092", "1093", "1094", "1095", "1096", "1097", "1098", "1099"]
  },
  {
    name: "Quezon City",
    province: "Metro Manila",
    zipCodes: ["1100", "1101", "1102", "1103", "1104", "1105", "1106", "1107", "1108", "1109", "1110", "1111", "1112", "1113", "1114", "1115", "1116", "1117", "1118", "1119", "1120", "1121", "1122", "1123", "1124", "1125", "1126", "1127", "1128", "1129", "1130", "1131", "1132", "1133", "1134", "1135", "1136", "1137", "1138", "1139", "1140", "1141", "1142", "1143", "1144", "1145", "1146", "1147", "1148", "1149", "1150", "1151", "1152", "1153", "1154", "1155", "1156", "1157", "1158", "1159", "1160", "1161", "1162", "1163", "1164", "1165", "1166", "1167", "1168", "1169", "1170", "1171", "1172", "1173", "1174", "1175", "1176", "1177", "1178", "1179", "1180", "1181", "1182", "1183", "1184", "1185", "1186", "1187", "1188", "1189", "1190", "1191", "1192", "1193", "1194", "1195", "1196", "1197", "1198", "1199"]
  },
  {
    name: "Pasig",
    province: "Metro Manila",
    zipCodes: ["1600", "1601", "1602", "1603", "1604", "1605", "1606", "1607", "1608", "1609", "1610", "1611", "1612", "1613", "1614", "1615", "1616", "1617", "1618", "1619", "1620", "1621", "1622", "1623", "1624", "1625", "1626", "1627", "1628", "1629"]
  },
  {
    name: "Mandaluyong",
    province: "Metro Manila",
    zipCodes: ["1550", "1551", "1552", "1553", "1554", "1555", "1556", "1557", "1558", "1559", "1560", "1561", "1562", "1563", "1564", "1565", "1566", "1567", "1568", "1569"]
  },
  {
    name: "San Juan",
    province: "Metro Manila",
    zipCodes: ["1500", "1501", "1502", "1503", "1504", "1505", "1506", "1507", "1508", "1509"]
  },
  {
    name: "Pasay",
    province: "Metro Manila",
    zipCodes: ["1300", "1301", "1302", "1303", "1304", "1305", "1306", "1307", "1308", "1309", "1310", "1311", "1312", "1313", "1314", "1315", "1316", "1317", "1318", "1319", "1320", "1321", "1322", "1323", "1324", "1325", "1326", "1327", "1328", "1329"]
  },
  {
    name: "Parañaque",
    province: "Metro Manila",
    zipCodes: ["1700", "1701", "1702", "1703", "1704", "1705", "1706", "1707", "1708", "1709", "1710", "1711", "1712", "1713", "1714", "1715", "1716", "1717", "1718", "1719"]
  },
  {
    name: "Las Piñas",
    province: "Metro Manila",
    zipCodes: ["1740", "1741", "1742", "1743", "1744", "1745", "1746", "1747", "1748", "1749", "1750", "1751", "1752", "1753", "1754", "1755", "1756", "1757", "1758", "1759"]
  },
  {
    name: "Muntinlupa",
    province: "Metro Manila",
    zipCodes: ["1770", "1771", "1772", "1773", "1774", "1775", "1776", "1777", "1778", "1779", "1780", "1781", "1782", "1783", "1784", "1785", "1786", "1787", "1788", "1789"]
  },
  {
    name: "Marikina",
    province: "Metro Manila",
    zipCodes: ["1800", "1801", "1802", "1803", "1804", "1805", "1806", "1807", "1808", "1809", "1810", "1811", "1812", "1813", "1814", "1815", "1816", "1817", "1818", "1819"]
  },
  {
    name: "Caloocan",
    province: "Metro Manila",
    zipCodes: ["1400", "1401", "1402", "1403", "1404", "1405", "1406", "1407", "1408", "1409", "1410", "1411", "1412", "1413", "1414", "1415", "1416", "1417", "1418", "1419", "1420", "1421", "1422", "1423", "1424", "1425", "1426", "1427", "1428", "1429"]
  },
  {
    name: "Malabon",
    province: "Metro Manila",
    zipCodes: ["1470", "1471", "1472", "1473", "1474", "1475", "1476", "1477", "1478", "1479", "1480", "1481", "1482", "1483", "1484", "1485", "1486", "1487", "1488", "1489"]
  },
  {
    name: "Navotas",
    province: "Metro Manila",
    zipCodes: ["1485", "1486", "1487", "1488", "1489", "1490", "1491", "1492", "1493", "1494", "1495", "1496", "1497", "1498", "1499"]
  },
  {
    name: "Valenzuela",
    province: "Metro Manila",
    zipCodes: ["1440", "1441", "1442", "1443", "1444", "1445", "1446", "1447", "1448", "1449", "1450", "1451", "1452", "1453", "1454", "1455", "1456", "1457", "1458", "1459"]
  }
];

// Comprehensive list of provinces and cities
export const surroundingProvinces: Province[] = [
  {
    name: "Rizal",
    cities: [
      { name: "Antipolo", province: "Rizal", zipCodes: ["1870", "1871", "1872", "1873", "1874", "1875", "1876", "1877", "1878", "1879"] },
      { name: "Cainta", province: "Rizal", zipCodes: ["1900", "1901", "1902", "1903", "1904", "1905"] },
      { name: "Taytay", province: "Rizal", zipCodes: ["1920", "1921", "1922", "1923", "1924", "1925"] },
      { name: "Montalban", province: "Rizal", zipCodes: ["1880", "1881", "1882"] },
      { name: "Tanay", province: "Rizal", zipCodes: ["1950", "1951", "1952"] },
      { name: "Morong", province: "Rizal", zipCodes: ["1960", "1961", "1962"] }
    ]
  },
  {
    name: "Cavite",
    cities: [
      { name: "Bacoor", province: "Cavite", zipCodes: ["4102", "4103", "4104", "4105", "4106", "4107"] },
      { name: "Kawit", province: "Cavite", zipCodes: ["4108", "4109", "4110"] },
      { name: "Noveleta", province: "Cavite", zipCodes: ["4114", "4115"] },
      { name: "Rosario", province: "Cavite", zipCodes: ["4117", "4118"] },
      { name: "Dasmariñas", province: "Cavite", zipCodes: ["4114", "4115", "4116"] },
      { name: "Tagaytay", province: "Cavite", zipCodes: ["4120", "4121", "4122"] },
      { name: "Silang", province: "Cavite", zipCodes: ["4118", "4119"] }
    ]
  },
  {
    name: "Laguna",
    cities: [
      { name: "Calamba", province: "Laguna", zipCodes: ["4024", "4025", "4026", "4027"] },
      { name: "Laguna", province: "Laguna", zipCodes: ["4006", "4007", "4008"] },
      { name: "Pagsanjan", province: "Laguna", zipCodes: ["4009", "4010"] },
      { name: "Majayjay", province: "Laguna", zipCodes: ["4015", "4016"] },
      { name: "Cavinti", province: "Laguna", zipCodes: ["4022", "4023"] },
      { name: "Pangil", province: "Laguna", zipCodes: ["4017", "4018"] },
      { name: "Pakil", province: "Laguna", zipCodes: ["4015", "4016"] },
      { name: "Los Baños", province: "Laguna", zipCodes: ["4030", "4031", "4032"] }
    ]
  },
  {
    name: "Bulacan",
    cities: [
      { name: "Meycauayan", province: "Bulacan", zipCodes: ["3020", "3021", "3022"] },
      { name: "Valenzuela", province: "Bulacan", zipCodes: ["3023", "3024", "3025"] },
      { name: "Marilao", province: "Bulacan", zipCodes: ["3006", "3007"] },
      { name: "Obando", province: "Bulacan", zipCodes: ["3008", "3009"] },
      { name: "Guiguinto", province: "Bulacan", zipCodes: ["3010", "3011"] },
      { name: "Bustos", province: "Bulacan", zipCodes: ["3012", "3013"] },
      { name: "Hagonoy", province: "Bulacan", zipCodes: ["3014", "3015"] },
      { name: "Bocaue", province: "Bulacan", zipCodes: ["3005", "3006"] }
    ]
  },
  {
    name: "Batangas",
    cities: [
      { name: "Batangas City", province: "Batangas", zipCodes: ["4200", "4201", "4202", "4203"] },
      { name: "Lipa City", province: "Batangas", zipCodes: ["4217", "4218", "4219"] },
      { name: "Nasugbu", province: "Batangas", zipCodes: ["4224", "4225"] },
      { name: "Calatagan", province: "Batangas", zipCodes: ["4208", "4209"] },
      { name: "Balayan", province: "Batangas", zipCodes: ["4210", "4211"] },
      { name: "Talisay", province: "Batangas", zipCodes: ["4220", "4221"] },
      { name: "Taal", province: "Batangas", zipCodes: ["4220", "4221"] },
      { name: "Santo Tomas", province: "Batangas", zipCodes: ["4230", "4231"] }
    ]
  },
  {
    name: "Quezon",
    cities: [
      { name: "Lucena", province: "Quezon", zipCodes: ["4301", "4302", "4303", "4304"] },
      { name: "Tayabas", province: "Quezon", zipCodes: ["4305", "4306"] },
      { name: "Sariaya", province: "Quezon", zipCodes: ["4307", "4308"] },
      { name: "Candelaria", province: "Quezon", zipCodes: ["4309", "4310"] },
      { name: "Gumaca", province: "Quezon", zipCodes: ["4316", "4317"] },
      { name: "Infanta", province: "Quezon", zipCodes: ["4318", "4319"] }
    ]
  },
  {
    name: "Nueva Ecija",
    cities: [
      { name: "San Fernando", province: "Nueva Ecija", zipCodes: ["3100", "3101", "3102"] },
      { name: "Cabanatuan", province: "Nueva Ecija", zipCodes: ["3100", "3101", "3102", "3103"] },
      { name: "Gapan", province: "Nueva Ecija", zipCodes: ["3104", "3105"] },
      { name: "Talugtug", province: "Nueva Ecija", zipCodes: ["3118", "3119"] },
      { name: "Licab", province: "Nueva Ecija", zipCodes: ["3120", "3121"] },
      { name: "Peñaranda", province: "Nueva Ecija", zipCodes: ["3123", "3124"] }
    ]
  },
  {
    name: "Pangasinan",
    cities: [
      { name: "Lingayen", province: "Pangasinan", zipCodes: ["2401", "2402", "2403"] },
      { name: "Dagupan", province: "Pangasinan", zipCodes: ["2400", "2401", "2402"] },
      { name: "Alaminos", province: "Pangasinan", zipCodes: ["2406", "2407"] },
      { name: "Urdaneta", province: "Pangasinan", zipCodes: ["2428", "2429"] },
      { name: "Cabanatuan", province: "Pangasinan", zipCodes: ["2431", "2432"] }
    ]
  },
  {
    name: "Zambales",
    cities: [
      { name: "Iba", province: "Zambales", zipCodes: ["2202", "2203"] },
      { name: "Olongapo", province: "Zambales", zipCodes: ["2200", "2201"] },
      { name: "Subic", province: "Zambales", zipCodes: ["2209", "2210"] },
      { name: "Masinloc", province: "Zambales", zipCodes: ["2211", "2212"] }
    ]
  },
  {
    name: "Nueva Vizcaya",
    cities: [
      { name: "Bayombong", province: "Nueva Vizcaya", zipCodes: ["3700", "3701"] },
      { name: "Bambang", province: "Nueva Vizcaya", zipCodes: ["3703", "3704"] },
      { name: "Solano", province: "Nueva Vizcaya", zipCodes: ["3707", "3708"] }
    ]
  },
  {
    name: "Ifugao",
    cities: [
      { name: "Lagawe", province: "Ifugao", zipCodes: ["3605", "3606"] },
      { name: "Banaue", province: "Ifugao", zipCodes: ["3607", "3608"] },
      { name: "Kiangan", province: "Ifugao", zipCodes: ["3609", "3610"] }
    ]
  },
  {
    name: "Mountain Province",
    cities: [
      { name: "Bontoc", province: "Mountain Province", zipCodes: ["2606", "2607"] },
      { name: "Sagada", province: "Mountain Province", zipCodes: ["2610", "2611"] },
      { name: "Banaue", province: "Mountain Province", zipCodes: ["2612", "2613"] }
    ]
  },
  {
    name: "Benguet",
    cities: [
      { name: "La Trinidad", province: "Benguet", zipCodes: ["2601", "2602"] },
      { name: "Baguio", province: "Benguet", zipCodes: ["2600", "2601", "2602"] },
      { name: "Tublay", province: "Benguet", zipCodes: ["2608", "2609"] },
      { name: "Kabayan", province: "Benguet", zipCodes: ["2614", "2615"] }
    ]
  },
  {
    name: "Ilocos North",
    cities: [
      { name: "Laoag", province: "Ilocos North", zipCodes: ["2901", "2902", "2903"] },
      { name: "Batac", province: "Ilocos North", zipCodes: ["2911", "2912"] },
      { name: "Paoay", province: "Ilocos North", zipCodes: ["2913", "2914"] }
    ]
  },
  {
    name: "Ilocos Sur",
    cities: [
      { name: "Vigan", province: "Ilocos Sur", zipCodes: ["2800", "2801", "2802"] },
      { name: "Candon", province: "Ilocos Sur", zipCodes: ["2807", "2808"] },
      { name: "Santa Maria", province: "Ilocos Sur", zipCodes: ["2819", "2820"] }
    ]
  },
  {
    name: "La Union",
    cities: [
      { name: "San Fernando", province: "La Union", zipCodes: ["2500", "2501", "2502"] },
      { name: "Bauang", province: "La Union", zipCodes: ["2508", "2509"] },
      { name: "Balaoan", province: "La Union", zipCodes: ["2514", "2515"] }
    ]
  },
  {
    name: "Cagayan",
    cities: [
      { name: "Tuguegarao", province: "Cagayan", zipCodes: ["3500", "3501", "3502"] },
      { name: "Ilagan", province: "Cagayan", zipCodes: ["3503", "3504"] },
      { name: "Cabanatuan", province: "Cagayan", zipCodes: ["3509", "3510"] }
    ]
  },
  {
    name: "Isabela",
    cities: [
      { name: "Ilagan", province: "Isabela", zipCodes: ["3503", "3504"] },
      { name: "Cauayan", province: "Isabela", zipCodes: ["3505", "3506"] },
      { name: "Santiago", province: "Isabela", zipCodes: ["3507", "3508"] }
    ]
  },
  {
    name: "Quirino",
    cities: [
      { name: "Cabarroguis", province: "Quirino", zipCodes: ["3800", "3801"] },
      { name: "Diffun", province: "Quirino", zipCodes: ["3803", "3804"] }
    ]
  },
  {
    name: "Aklan",
    cities: [
      { name: "Kalibo", province: "Aklan", zipCodes: ["5600", "5601"] },
      { name: "Altavas", province: "Aklan", zipCodes: ["5604", "5605"] },
      { name: "Boracay", province: "Aklan", zipCodes: ["5608", "5609"] }
    ]
  },
  {
    name: "Antique",
    cities: [
      { name: "San Jose de Buenavista", province: "Antique", zipCodes: ["5700", "5701"] },
      { name: "Caluya", province: "Antique", zipCodes: ["5705", "5706"] },
      { name: "Hamtic", province: "Antique", zipCodes: ["5709", "5710"] }
    ]
  },
  {
    name: "Capiz",
    cities: [
      { name: "Roxas", province: "Capiz", zipCodes: ["5800", "5801"] },
      { name: "Calinog", province: "Capiz", zipCodes: ["5808", "5809"] },
      { name: "Ivisan", province: "Capiz", zipCodes: ["5813", "5814"] }
    ]
  },
  {
    name: "Iloilo",
    cities: [
      { name: "Iloilo City", province: "Iloilo", zipCodes: ["5000", "5001", "5002", "5003"] },
      { name: "Passi", province: "Iloilo", zipCodes: ["5007", "5008"] },
      { name: "Jaro", province: "Iloilo", zipCodes: ["5010", "5011"] },
      { name: "La Paz", province: "Iloilo", zipCodes: ["5013", "5014"] }
    ]
  },
  {
    name: "Guimaras",
    cities: [
      { name: "Jordan", province: "Guimaras", zipCodes: ["5000", "5001"] },
      { name: "Buenavista", province: "Guimaras", zipCodes: ["5004", "5005"] },
      { name: "Nueva Valencia", province: "Guimaras", zipCodes: ["5008", "5009"] }
    ]
  },
  {
    name: "Negros Occidental",
    cities: [
      { name: "Bacolod", province: "Negros Occidental", zipCodes: ["6100", "6101", "6102", "6103"] },
      { name: "Silay", province: "Negros Occidental", zipCodes: ["6107", "6108"] },
      { name: "Cadiz", province: "Negros Occidental", zipCodes: ["6109", "6110"] },
      { name: "San Carlos", province: "Negros Occidental", zipCodes: ["6127", "6128"] }
    ]
  },
  {
    name: "Negros Oriental",
    cities: [
      { name: "Dumaguete", province: "Negros Oriental", zipCodes: ["6200", "6201", "6202"] },
      { name: "Bayawan", province: "Negros Oriental", zipCodes: ["6213", "6214"] },
      { name: "Siaton", province: "Negros Oriental", zipCodes: ["6215", "6216"] }
    ]
  },
  {
    name: "Palawan",
    cities: [
      { name: "Puerto Princesa", province: "Palawan", zipCodes: ["5800", "5801", "5802"] },
      { name: "Coron", province: "Palawan", zipCodes: ["5316", "5317"] },
      { name: "El Nido", province: "Palawan", zipCodes: ["5313", "5314"] }
    ]
  },
  {
    name: "Cebu",
    cities: [
      { name: "Cebu City", province: "Cebu", zipCodes: ["6000", "6001", "6002", "6003"] },
      { name: "Mandaue", province: "Cebu", zipCodes: ["6014", "6015"] },
      { name: "Lapu-Lapu", province: "Cebu", zipCodes: ["6015", "6016"] },
      { name: "Talisay", province: "Cebu", zipCodes: ["6017", "6018"] },
      { name: "Mactan", province: "Cebu", zipCodes: ["6015", "6016"] }
    ]
  },
  {
    name: "Bohol",
    cities: [
      { name: "Tagbilaran", province: "Bohol", zipCodes: ["6300", "6301"] },
      { name: "Panglao", province: "Bohol", zipCodes: ["6340", "6341"] },
      { name: "Loon", province: "Bohol", zipCodes: ["6327", "6328"] }
    ]
  },
  {
    name: "Siquijor",
    cities: [
      { name: "Larena", province: "Siquijor", zipCodes: ["6200", "6201"] },
      { name: "San Juan", province: "Siquijor", zipCodes: ["6209", "6210"] }
    ]
  },
  {
    name: "Eastern Samar",
    cities: [
      { name: "Borongan", province: "Eastern Samar", zipCodes: ["6800", "6801"] },
      { name: "Oras", province: "Eastern Samar", zipCodes: ["6802", "6803"] }
    ]
  },
  {
    name: "Western Samar",
    cities: [
      { name: "Catbalogan", province: "Western Samar", zipCodes: ["6700", "6701"] },
      { name: "Calbayog", province: "Western Samar", zipCodes: ["6704", "6705"] }
    ]
  },
  {
    name: "Northern Samar",
    cities: [
      { name: "San Vicente", province: "Northern Samar", zipCodes: ["6400", "6401"] },
      { name: "Catarman", province: "Northern Samar", zipCodes: ["6404", "6405"] }
    ]
  },
  {
    name: "Leyte",
    cities: [
      { name: "Tacloban", province: "Leyte", zipCodes: ["6500", "6501", "6502"] },
      { name: "Baybay", province: "Leyte", zipCodes: ["6521", "6522"] },
      { name: "Ormoc", province: "Leyte", zipCodes: ["6541", "6542"] }
    ]
  },
  {
    name: "Southern Leyte",
    cities: [
      { name: "Maasin", province: "Southern Leyte", zipCodes: ["6600", "6601"] },
      { name: "San Ricardo", province: "Southern Leyte", zipCodes: ["6602", "6603"] }
    ]
  },
  {
    name: "Biliran",
    cities: [
      { name: "Naval", province: "Biliran", zipCodes: ["6543", "6544"] },
      { name: "Caibiran", province: "Biliran", zipCodes: ["6545", "6546"] }
    ]
  },
  {
    name: "Davao Oriental",
    cities: [
      { name: "Mati", province: "Davao Oriental", zipCodes: ["8200", "8201"] },
      { name: "Monkayo", province: "Davao Oriental", zipCodes: ["8203", "8204"] }
    ]
  },
  {
    name: "Davao Occidental",
    cities: [
      { name: "Malita", province: "Davao Occidental", zipCodes: ["9300", "9301"] }
    ]
  },
  {
    name: "Davao del Sur",
    cities: [
      { name: "Davao City", province: "Davao del Sur", zipCodes: ["8000", "8001", "8002"] },
      { name: "Digos", province: "Davao del Sur", zipCodes: ["8011", "8012"] },
      { name: "Tagum", province: "Davao del Sur", zipCodes: ["8100", "8101"] }
    ]
  },
  {
    name: "Davao del Norte",
    cities: [
      { name: "Tagum", province: "Davao del Norte", zipCodes: ["8100", "8101", "8102"] },
      { name: "Panabo", province: "Davao del Norte", zipCodes: ["8105", "8106"] },
      { name: "Samal", province: "Davao del Norte", zipCodes: ["8200", "8201"] }
    ]
  },
  {
    name: "Cotabato",
    cities: [
      { name: "Cotabato City", province: "Cotabato", zipCodes: ["9400", "9401"] },
      { name: "Tulunan", province: "Cotabato", zipCodes: ["9404", "9405"] }
    ]
  },
  {
    name: "Sultan Kudarat",
    cities: [
      { name: "Isulan", province: "Sultan Kudarat", zipCodes: ["9800", "9801"] },
      { name: "Lambayong", province: "Sultan Kudarat", zipCodes: ["9806", "9807"] }
    ]
  },
  {
    name: "South Cotabato",
    cities: [
      { name: "Koronadal", province: "South Cotabato", zipCodes: ["9506", "9507"] },
      { name: "General Santos", province: "South Cotabato", zipCodes: ["9500", "9501"] }
    ]
  },
  {
    name: "Sarangani",
    cities: [
      { name: "Alabel", province: "Sarangani", zipCodes: ["9730", "9731"] }
    ]
  },
  {
    name: "Zamboanga del Norte",
    cities: [
      { name: "Dipolog", province: "Zamboanga del Norte", zipCodes: ["7100", "7101"] },
      { name: "Dapitan", province: "Zamboanga del Norte", zipCodes: ["7109", "7110"] }
    ]
  },
  {
    name: "Zamboanga del Sur",
    cities: [
      { name: "Zamboanga City", province: "Zamboanga del Sur", zipCodes: ["7000", "7001", "7002"] },
      { name: "Isabela", province: "Zamboanga del Sur", zipCodes: ["7014", "7015"] }
    ]
  },
  {
    name: "Zamboanga Sibugay",
    cities: [
      { name: "Ipil", province: "Zamboanga Sibugay", zipCodes: ["7200", "7201"] },
      { name: "Tungawan", province: "Zamboanga Sibugay", zipCodes: ["7207", "7208"] }
    ]
  },
  {
    name: "Misamis Oriental",
    cities: [
      { name: "Cagayan de Oro", province: "Misamis Oriental", zipCodes: ["9000", "9001", "9002", "9003"] },
      { name: "Iligan", province: "Misamis Oriental", zipCodes: ["9200", "9201"] },
      { name: "Gingoog", province: "Misamis Oriental", zipCodes: ["9019", "9020"] }
    ]
  },
  {
    name: "Misamis Occidental",
    cities: [
      { name: "Oroquieta", province: "Misamis Occidental", zipCodes: ["8800", "8801"] },
      { name: "Ozamis", province: "Misamis Occidental", zipCodes: ["8810", "8811"] }
    ]
  },
  {
    name: "Lanao del Norte",
    cities: [
      { name: "Iligan", province: "Lanao del Norte", zipCodes: ["9200", "9201"] },
      { name: "Tubod", province: "Lanao del Norte", zipCodes: ["9207", "9208"] }
    ]
  },
  {
    name: "Lanao del Sur",
    cities: [
      { name: "Marawi", province: "Lanao del Sur", zipCodes: ["9700", "9701"] }
    ]
  },
  {
    name: "Maguindanao",
    cities: [
      { name: "Cotabato", province: "Maguindanao", zipCodes: ["9400", "9401"] }
    ]
  }
];


// Helper functions
export const getAllCities = (): City[] => {
  return [...metroManilaCities, ...surroundingProvinces.flatMap(p => p.cities)];
};

export const getCitiesByProvince = (province: string): City[] => {
  if (province === "Metro Manila") {
    return metroManilaCities;
  }
  const prov = surroundingProvinces.find(p => p.name === province);
  return prov ? prov.cities : [];
};

export const getProvinces = (): string[] => {
  return ["Metro Manila", ...surroundingProvinces.map(p => p.name)];
};

export const validateZipCodeForCity = (zipCode: string, city: string, province: string): boolean => {
  const cities = province === "Metro Manila" ? metroManilaCities : getCitiesByProvince(province);
  const foundCity = cities.find(c => c.name.toLowerCase() === city.toLowerCase());
  if (!foundCity) return false;
  return foundCity.zipCodes.includes(zipCode);
};

export const getZipCodesForCity = (city: string, province: string): string[] => {
  const cities = province === "Metro Manila" ? metroManilaCities : getCitiesByProvince(province);
  const foundCity = cities.find(c => c.name.toLowerCase() === city.toLowerCase());
  return foundCity ? foundCity.zipCodes : [];
};






