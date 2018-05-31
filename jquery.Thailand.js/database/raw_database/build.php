<?php
/*
 * Generate db.json from raw_database.csv
 * $ php build.php
 */
$row = 1;
$db_th = [];
$geodb_th = [];
$db_en = [];
$geodb_en = [];
if (($fp = fopen("raw_database.csv", "r")) !== FALSE) {
	while (($data = fgetcsv($fp)) !== FALSE) {
		if ($row++ > 1) {
			$db_th[$data[2]][$data[1]][$data[0]][] = $data[3];
			$geodb_th[$data[2].'|'.$data[6]][$data[1].'|'.$data[5]][$data[0].'|'.$data[4]][] = $data[3];
			$db_en[$data[9]][$data[8]][$data[7]][] = $data[3];
			$geodb_en[$data[9].'|'.$data[6]][$data[8].'|'.$data[5]][$data[7].'|'.$data[4]][] = $data[3];
		}
	}
	fclose($fp);
}
file_put_contents('../db-th.json', json_encode($db_th, JSON_UNESCAPED_UNICODE ));
file_put_contents('../geodb-th.json', json_encode($geodb_th, JSON_UNESCAPED_UNICODE ));
file_put_contents('../db-en.json', json_encode($db_en, JSON_UNESCAPED_UNICODE ));
file_put_contents('../geodb-en.json', json_encode($geodb_en, JSON_UNESCAPED_UNICODE ));
