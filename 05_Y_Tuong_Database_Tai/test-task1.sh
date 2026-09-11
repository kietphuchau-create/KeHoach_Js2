#!/usr/bin/env bash
# =====================================================================
# Kiem thu tu dong toan bo Task 1 (Auth + Quan ly nguoi dung) qua HTTP.
#
# Cach dung:
#   1. Bat MySQL trong XAMPP Control Panel
#   2. ./gradlew bootRun          (mac dinh da la profile mysql-xampp)
#   3. bash test-task1.sh          (hoac: BASE=http://localhost:8081 bash test-task1.sh)
# =====================================================================
BASE="${BASE:-http://localhost:8080}"
PASS=0; FAIL=0

# Doc 1 gia tri tu JSON: j "['field']" < file   (bool in ra true/false kieu JSON)
j() { python -c "
import sys, json
d = json.load(sys.stdin)
v = d$1
print(str(v).lower() if isinstance(v, bool) else v)" 2>/dev/null; }

# Doc gia tri bang bieu thuc Python tuy y, dung duoc ca khi JSON tra ve la MANG.
# Doc qua stdin (khong mo file theo duong dan) vi python ban Windows hieu /tmp
# khac voi bash cua MSYS.
jf() { python -c "
import sys, json
d = json.load(sys.stdin)
v = eval(sys.argv[1])
print(str(v).lower() if isinstance(v, bool) else v)" "$1" 2>/dev/null; }

# So sanh SO (tranh lech kieu 350000.00 vs 350000.0)
checkn() {
  if python -c "import sys;sys.exit(0 if abs(float('$2')-float('${3:-0}'))<0.001 else 1)" 2>/dev/null; then
    echo "  [PASS] $1"; PASS=$((PASS+1))
  else echo "  [FAIL] $1 (mong doi: $2 | thuc te: $3)"; FAIL=$((FAIL+1)); fi
}

check() { # check "ten" "mong doi" "thuc te"
  if [ "$2" = "$3" ]; then echo "  [PASS] $1"; PASS=$((PASS+1));
  else echo "  [FAIL] $1 (mong doi: $2 | thuc te: $3)"; FAIL=$((FAIL+1)); fi
}

code() { # code METHOD PATH [BODY] [TOKEN]
  if [ -n "$4" ]; then
    curl -s -o /tmp/r.json -w "%{http_code}" -X "$1" "$BASE$2" -H "Content-Type: application/json" \
         -H "Authorization: Bearer $4" ${3:+-d "$3"}
  else
    curl -s -o /tmp/r.json -w "%{http_code}" -X "$1" "$BASE$2" -H "Content-Type: application/json" ${3:+-d "$3"}
  fi
}

login() { # login email password -> in ra access token
  curl -s -X POST "$BASE/api/v1/auth/login" -H "Content-Type: application/json" \
       -d "{\"email\":\"$1\",\"password\":\"$2\"}" | j "['accessToken']"
}

echo "===== 1. REGISTER (Customer) ====="
NEW_EMAIL="tu.test.$(date +%s)@gmail.com"
c=$(code POST /api/v1/auth/register "{\"email\":\"$NEW_EMAIL\",\"password\":\"Matkhau@123\",\"fullName\":\"Nguyen Van Test\",\"phone\":\"0912345678\"}")
check "dang ky tai khoan moi tra ve 201" 201 "$c"
check "tra ve access token" "true" "$(j "['accessToken'][:3]=='eyJ'" < /tmp/r.json)"
check "tai khoan moi mac dinh la benh nhan" "['ROLE_PATIENT']" "$(j "['roles']" < /tmp/r.json)"

c=$(code POST /api/v1/auth/register "{\"email\":\"$NEW_EMAIL\",\"password\":\"Matkhau@123\",\"fullName\":\"Trung Email\"}")
check "dang ky trung email bi chan (409)" 409 "$c"

c=$(code POST /api/v1/auth/register '{"email":"sai-dinh-dang","password":"123","fullName":""}')
check "du lieu sai bi validate (400)" 400 "$c"
check "bao loi tung truong" "true" "$(j "['fieldErrors'] is not None" < /tmp/r.json)"

echo "===== 2. LOGIN (4 vai tro) ====="
CUS=$(login "benhnhan.demo@gmail.com" "Medsched@123")
DOC=$(login "dr.minhanh@medsched.vn" "Medsched@123")
STF=$(login "letan.q1@medsched.vn" "Medsched@123")
ADM=$(login "admin@medsched.vn" "Medsched@123")
check "Customer dang nhap duoc" "true" "$([ -n "$CUS" ] && echo true)"
check "Doctor dang nhap duoc" "true" "$([ -n "$DOC" ] && echo true)"
check "Staff dang nhap duoc" "true" "$([ -n "$STF" ] && echo true)"
check "Admin dang nhap duoc" "true" "$([ -n "$ADM" ] && echo true)"

c=$(code POST /api/v1/auth/login '{"email":"admin@medsched.vn","password":"sai-mat-khau"}')
check "sai mat khau bi tu choi (401)" 401 "$c"
c=$(code POST /api/v1/auth/login '{"email":"khong-ton-tai@x.com","password":"Medsched@123"}')
check "email khong ton tai cung tra 401 (khong lo thong tin)" 401 "$c"

echo "===== 3. GET /me ====="
c=$(code GET /api/v1/me "" "$DOC")
check "bac si xem duoc ho so" 200 "$c"
check "bac si co 2 ho so hanh nghe (2 chi nhanh)" 2 "$(j "['doctorProfiles'].__len__()" < /tmp/r.json)"
c=$(code GET /api/v1/me "" "$CUS")
check "benh nhan co ho so nguoi kham SELF" "true" "$(j "['patientProfile'] is not None" < /tmp/r.json)"
c=$(code GET /api/v1/me)
check "khong co token bi chan (401)" 401 "$c"
c=$(code GET /api/v1/me "" "token-gia-mao")
check "token gia mao bi chan (401)" 401 "$c"

echo "===== 4. UPDATE PROFILE ====="
c=$(code PUT /api/v1/me '{"fullName":"Tran Van Hoang (da doi ten)","phone":"0987654321"}' "$CUS")
check "cap nhat ho so tra 200" 200 "$c"
check "ten moi da luu" "Tran Van Hoang (da doi ten)" "$(j "['fullName']" < /tmp/r.json)"
check "so dien thoai moi da luu" "0987654321" "$(j "['phone']" < /tmp/r.json)"

c=$(code PUT /api/v1/me '{"fullName":"X","phone":"912345678"}' "$CUS")
check "so dien thoai sai dinh dang bi chan (400)" 400 "$c"

c=$(code PUT /api/v1/me/doctor-profile '{"academicTitle":"PGS.TS","experienceYears":20,"bio":"Cap nhat tieu su","avatarUrl":""}' "$DOC")
check "bac si cap nhat ho so chuyen mon" 200 "$c"
check "ap dung cho ca 2 chi nhanh" "PGS.TS,PGS.TS" "$(jf "','.join(p['academicTitle'] for p in d)" < /tmp/r.json)"

c=$(code PUT /api/v1/me/doctor-profile '{"academicTitle":"BS","experienceYears":5,"bio":"","avatarUrl":""}' "$CUS")
check "benh nhan KHONG sua duoc ho so bac si (403)" 403 "$c"

c=$(code PUT /api/v1/me/patient-profile '{"fullName":"Tran Van Hoang","cccdNumber":"079201008899","healthInsuranceNo":"DN123","dateOfBirth":"2001-05-12","gender":"MALE","phone":"0912345678","address":"Quan 1","medicalHistory":"Di ung phan hoa"}' "$CUS")
check "cap nhat ho so y te" 200 "$c"
check "gioi tinh da luu" "MALE" "$(j "['gender']" < /tmp/r.json)"

echo "===== 5. CHANGE PASSWORD ====="
c=$(code POST /api/v1/me/change-password '{"currentPassword":"sai-mat-khau-cu","newPassword":"Matkhau@456"}' "$STF")
check "sai mat khau hien tai bi chan (400)" 400 "$c"
c=$(code POST /api/v1/me/change-password '{"currentPassword":"Medsched@123","newPassword":"Medsched@123"}' "$STF")
check "mat khau moi trung mat khau cu bi chan (400)" 400 "$c"
c=$(code POST /api/v1/me/change-password '{"currentPassword":"Medsched@123","newPassword":"123"}' "$STF")
check "mat khau moi qua ngan bi chan (400)" 400 "$c"
c=$(code POST /api/v1/me/change-password '{"currentPassword":"Medsched@123","newPassword":"Matkhau@456"}' "$STF")
check "doi mat khau thanh cong (204)" 204 "$c"
check "dang nhap bang mat khau MOI" "true" "$([ -n "$(login 'letan.q1@medsched.vn' 'Matkhau@456')" ] && echo true)"
check "mat khau CU khong con dung duoc" "true" "$([ -z "$(login 'letan.q1@medsched.vn' 'Medsched@123')" ] && echo true)"
# tra lai mat khau cu de chay lai script duoc nhieu lan
STF2=$(login "letan.q1@medsched.vn" "Matkhau@456")
code POST /api/v1/me/change-password '{"currentPassword":"Matkhau@456","newPassword":"Medsched@123"}' "$STF2" > /dev/null

echo "===== 6. ADMIN - QUAN LY USER THEO ROLE ====="
c=$(code GET "/api/v1/admin/users?role=ALL" "" "$ADM")
check "admin xem duoc danh sach user" 200 "$c"
TOTAL=$(j "['totalItems']" < /tmp/r.json)
check "co it nhat 4 tai khoan" "true" "$([ "$TOTAL" -ge 4 ] && echo true)"
c=$(code GET "/api/v1/admin/users?role=ROLE_DOCTOR" "" "$ADM")
check "loc theo ROLE_DOCTOR" "true" "$(j "['totalItems']>=1" < /tmp/r.json)"
c=$(code GET "/api/v1/admin/users?role=CUSTOMER" "" "$ADM")
check "loc khach hang (khong co quyen nhan su)" "true" "$(j "['totalItems']>=1" < /tmp/r.json)"
c=$(code GET "/api/v1/admin/users?role=ALL&q=admin" "" "$ADM")
check "tim kiem theo tu khoa" "true" "$(j "['items'][0]['email'].startswith('admin')" < /tmp/r.json)"

c=$(code GET "/api/v1/admin/users?role=ALL" "" "$CUS")
check "benh nhan KHONG vao duoc trang admin (403)" 403 "$c"
c=$(code GET "/api/v1/admin/users?role=ALL" "" "$STF")
check "le tan KHONG vao duoc trang admin (403)" 403 "$c"

echo "===== 7. ADMIN - TAO STAFF & DOCTOR ====="
TS=$(date +%s)
CENTER=$(curl -s "$BASE/api/v1/medical-centers" -H "Authorization: Bearer $ADM" | python -c "import sys,json;print(json.load(sys.stdin)[0]['id'])")
SPEC=$(curl -s "$BASE/api/v1/specialties" -H "Authorization: Bearer $ADM" | python -c "import sys,json;print(json.load(sys.stdin)[0]['id'])")

c=$(code POST /api/v1/admin/users/staff "{\"email\":\"letan.moi.$TS@medsched.vn\",\"password\":\"Matkhau@123\",\"fullName\":\"Le Tan Moi\",\"phone\":\"0911222333\",\"medicalCenterId\":\"$CENTER\"}" "$ADM")
check "admin tao tai khoan le tan (201)" 201 "$c"
check "le tan moi co dung quyen ROLE_STAFF" "ROLE_STAFF" "$(j "['roles'][0]['role']" < /tmp/r.json)"
check "le tan moi dang nhap duoc" "true" "$([ -n "$(login "letan.moi.$TS@medsched.vn" 'Matkhau@123')" ] && echo true)"

c=$(code POST /api/v1/admin/users/doctors "{\"email\":\"bacsi.moi.$TS@medsched.vn\",\"password\":\"Matkhau@123\",\"fullName\":\"BS Nguyen Van Moi\",\"phone\":\"0911222444\",\"specialtyId\":\"$SPEC\",\"academicTitle\":\"ThS.BS\",\"experienceYears\":8,\"consultationFee\":350000,\"roomNumber\":\"P.301\"}" "$ADM")
check "admin tao tai khoan bac si (201)" 201 "$c"
check "bac si moi co dung quyen ROLE_DOCTOR" "ROLE_DOCTOR" "$(j "['roles'][0]['role']" < /tmp/r.json)"
NEWDOC=$(login "bacsi.moi.$TS@medsched.vn" "Matkhau@123")
c=$(code GET /api/v1/me "" "$NEWDOC")
check "bac si moi co ho so hanh nghe" 1 "$(j "['doctorProfiles'].__len__()" < /tmp/r.json)"
checkn "gia kham da luu dung" "350000" "$(j "['doctorProfiles'][0]['consultationFee']" < /tmp/r.json)"

c=$(code POST /api/v1/admin/users/doctors "{\"email\":\"bs.loi.$TS@x.vn\",\"password\":\"Matkhau@123\",\"fullName\":\"BS Loi\",\"specialtyId\":\"khong-ton-tai\",\"academicTitle\":\"BS\",\"experienceYears\":1,\"consultationFee\":100000}" "$ADM")
check "chuyen khoa khong ton tai bi chan (404)" 404 "$c"

echo "===== 8. ADMIN - KHOA / MO KHOA TAI KHOAN ====="
VICTIM=$(curl -s "$BASE/api/v1/admin/users?role=ROLE_STAFF&q=letan.moi.$TS" -H "Authorization: Bearer $ADM" | python -c "import sys,json;print(json.load(sys.stdin)['items'][0]['userId'])")
c=$(code PATCH "/api/v1/admin/users/$VICTIM/status" '{"active":false}' "$ADM")
check "khoa tai khoan (200)" 200 "$c"
check "tai khoan bi khoa KHONG dang nhap duoc" "true" "$([ -z "$(login "letan.moi.$TS@medsched.vn" 'Matkhau@123')" ] && echo true)"
c=$(code PATCH "/api/v1/admin/users/$VICTIM/status" '{"active":true}' "$ADM")
check "mo khoa lai (200)" 200 "$c"
check "mo khoa xong dang nhap lai duoc" "true" "$([ -n "$(login "letan.moi.$TS@medsched.vn" 'Matkhau@123')" ] && echo true)"

echo "===== 9. ADMIN - CRUD DANH MUC ====="
c=$(code POST /api/v1/admin/medical-centers "{\"code\":\"MED_TEST$TS\",\"name\":\"Chi Nhanh Test\",\"address\":\"123 Duong Test\",\"phone\":\"0281234567\"}" "$ADM")
check "tao co so y te (201)" 201 "$c"
NEWCENTER=$(j "['id']" < /tmp/r.json)
c=$(code PUT "/api/v1/admin/medical-centers/$NEWCENTER" "{\"code\":\"MED_TEST$TS\",\"name\":\"Chi Nhanh Test (da sua)\",\"address\":\"456 Duong Moi\",\"phone\":\"0287654321\"}" "$ADM")
check "sua co so y te" "Chi Nhanh Test (da sua)" "$(j "['name']" < /tmp/r.json)"
c=$(code POST /api/v1/admin/medical-centers "{\"code\":\"MED_TEST$TS\",\"name\":\"Trung ma\",\"address\":\"x\"}" "$ADM")
check "trung ma co so bi chan (409)" 409 "$c"

c=$(code POST /api/v1/admin/specialties "{\"medicalCenterId\":\"$NEWCENTER\",\"name\":\"Khoa Test\",\"code\":\"TEST_SPEC\",\"description\":\"mo ta\"}" "$ADM")
check "tao chuyen khoa (201)" 201 "$c"
NEWSPEC=$(j "['id']" < /tmp/r.json)

c=$(code POST /api/v1/admin/services "{\"specialtyId\":\"$NEWSPEC\",\"name\":\"Dich vu Test\",\"code\":\"SV_TEST\",\"description\":\"mo ta\",\"price\":500000,\"estimatedDurationMinutes\":40}" "$ADM")
check "tao dich vu kham (201)" 201 "$c"
NEWSV=$(j "['id']" < /tmp/r.json)
checkn "gia dich vu luu dung" "500000" "$(j "['price']" < /tmp/r.json)"
c=$(code POST /api/v1/admin/services "{\"specialtyId\":\"$NEWSPEC\",\"name\":\"Gia am\",\"code\":\"SV_AM\",\"price\":-1000,\"estimatedDurationMinutes\":30}" "$ADM")
check "gia dich vu am bi chan (400)" 400 "$c"
c=$(code PUT "/api/v1/admin/services/$NEWSV" "{\"specialtyId\":\"$NEWSPEC\",\"name\":\"Dich vu Test (da sua)\",\"code\":\"SV_TEST\",\"price\":600000,\"estimatedDurationMinutes\":50}" "$ADM")
checkn "sua dich vu" "600000" "$(j "['price']" < /tmp/r.json)"
c=$(code DELETE "/api/v1/admin/services/$NEWSV" "" "$ADM")
check "ngung cung cap dich vu (204)" 204 "$c"
c=$(code DELETE "/api/v1/admin/specialties/$NEWSPEC" "" "$ADM")
check "xoa chuyen khoa chua co bac si (204)" 204 "$c"
c=$(code DELETE "/api/v1/admin/specialties/$SPEC" "" "$ADM")
check "KHONG xoa duoc chuyen khoa dang co bac si (409)" 409 "$c"
c=$(code DELETE "/api/v1/admin/medical-centers/$NEWCENTER" "" "$ADM")
check "ngung hoat dong co so y te (204)" 204 "$c"
c=$(code POST /api/v1/admin/medical-centers '{"code":"X","name":"Y","address":"Z"}' "$CUS")
check "benh nhan KHONG tao duoc co so y te (403)" 403 "$c"

echo "===== 10. REFRESH TOKEN ====="
REF=$(curl -s -X POST "$BASE/api/v1/auth/login" -H "Content-Type: application/json" \
      -d '{"email":"admin@medsched.vn","password":"Medsched@123"}' | j "['refreshToken']")
c=$(code POST /api/v1/auth/refresh "{\"refreshToken\":\"$REF\"}")
check "doi refresh token lay access token moi" 200 "$c"
check "tra ve access token moi" "true" "$(j "['accessToken'][:3]=='eyJ'" < /tmp/r.json)"
ACC=$(j "['accessToken']" < /tmp/r.json)
c=$(code POST /api/v1/auth/refresh "{\"refreshToken\":\"$ACC\"}")
check "KHONG dung access token de refresh duoc (400)" 400 "$c"
c=$(code GET /api/v1/me "" "$REF")
check "KHONG dung refresh token de goi API duoc (401)" 401 "$c"

echo
echo "==================================================="
echo " KET QUA: $PASS PASS / $FAIL FAIL"
echo "==================================================="
[ "$FAIL" -gt 0 ] && exit 1 || exit 0
