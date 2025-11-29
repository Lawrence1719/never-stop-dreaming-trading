/**
 * Philippines Address Data
 * Contains cities, provinces, and zip codes for Metro Manila and surrounding areas
 * Focus on Metro Manila and Taguig area as per business requirements
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

// Surrounding provinces (for future expansion)
export const surroundingProvinces: Province[] = [
  {
    name: "Rizal",
    cities: [
      { name: "Antipolo", province: "Rizal", zipCodes: ["1870", "1871", "1872", "1873", "1874", "1875", "1876", "1877", "1878", "1879"] },
      { name: "Cainta", province: "Rizal", zipCodes: ["1900", "1901", "1902", "1903", "1904", "1905"] },
      { name: "Taytay", province: "Rizal", zipCodes: ["1920", "1921", "1922", "1923", "1924", "1925"] }
    ]
  },
  {
    name: "Cavite",
    cities: [
      { name: "Bacoor", province: "Cavite", zipCodes: ["4102", "4103", "4104", "4105", "4106", "4107"] },
      { name: "Las Piñas", province: "Cavite", zipCodes: ["1740", "1741", "1742", "1743", "1744", "1745"] }
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


