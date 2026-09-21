<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('proveedores', function (Blueprint $table) {
            $table->id();
            $table->string('nit', 20)->unique();
            $table->string('naturaleza', 30);
            $table->string('nombre', 200);
            $table->timestamps();
        });

        $proveedores = [
            ['900480656', 'JURIDICA', 'TEK SOLUCIONES TECNOLOGICAS S.A.S.'],
            ['900709917', 'JURIDICA', 'TRADE CENTER S.A.S. OPERADOR COMERCIAL'],
            ['1053783027', 'JURIDICA', 'MAURICIO GUERRERO CARDENAS'],
            ['816004007', 'JURIDICA', 'ENCISO LTDA'],
            ['900281462', 'JURIDICA', 'VERTICAL COLOMBIA SAS'],
            ['900319753', 'JURIDICA', 'PRICESMART COLOMBIA SAS'],
            ['800226923', 'JURIDICA', 'SIGNAL MARKETING LTDA'],
            ['9869929', 'JURIDICA', 'WILSON ALEJANDRO GALLEGO OSORIO'],
            ['900318577', 'JURIDICA', 'ILUMINACION Y METALELECTRICA SAS'],
            ['890900943', 'JURIDICA', 'COLOMBIANA DE COMERCIO ALKOMPRAR'],
            ['860531287', 'JURIDICA', 'MELEXA SAS'],
            ['811046254', 'JURIDICA', 'SMART CHIP SAS'],
            ['900592894', 'JURIDICA', 'CARPAS CUBRIARTEC SAS'],
            ['900139568', 'JURIDICA', 'ELECTRICOS E ILUMINACION SAS'],
            ['890941103', 'GRAN CONTRIBUYENTE', 'EQUIELECT SAS'],
            ['900253186', 'JURIDICA', 'IKONO TELECOMUNICACIONES SA'],
            ['800049074', 'JURIDICA', 'PAPELERIA Y SERVICIOS SAS'],
            ['7505572', 'JURIDICA', 'GONZALO GOMEZ LONDOÑO'],
            ['28213118', 'JURIDICA', 'LUCILA REGUEROS SANDOVAL'],
            ['900509074', 'JURIDICA', 'FERREMETALES JR SAS'],
            ['816000456', 'JURIDICA', 'PAPELERIA MODELO SAS'],
            ['890900608', 'GRAN CONTRIBUYENTE', 'ALMACENES EXITO SA'],
            ['805019312', 'JURIDICA', 'FERREPLASTICOS CALI SAS'],
            ['860039794', 'JURIDICA', 'CALYPSO BARRANQUILLA LTDA'],
            ['2090579', 'JURIDICA', 'JOSE FERMIN CACERES CASTRO'],
            ['812008551', 'JURIDICA', 'COMCENTER SAS'],
            ['901035440', 'JURIDICA', 'ELECTRITODO SAN ANTONIO SAS'],
            ['891408710', 'JURIDICA', 'PROCIENTIFICA DE COLOMBIA SAS'],
            ['900547793', 'JURIDICA', 'COMERCIALIZADORA DYM TOOLS SAS'],
            ['816005590', 'JURIDICA', 'DISTRICOM DE COLOMBIA SAS'],
            ['830122566', 'JURIDICA', 'COLOMBIA TELECOMUNICACIONES S.A ESP'],
            ['811042355', 'JURIDICA', 'SIGMA ENERTEL S.A.S'],
            ['900171557', 'JURIDICA', 'SUPER MUEBLES PEREIRA SAS'],
            ['891410828', 'JURIDICA', 'CASA DEL BOMBILLO N 2 LTDA'],
            ['807001732', 'JURIDICA', 'COMERCIALIZADORA HVC SAS'],
            ['816007957', 'JURIDICA', 'CONFECCIONES E.U'],
            ['79506012', 'NATURAL', 'JAIME LUGO LOZANO'],
            ['901191897', 'JURIDICA', 'UNIDOTACIONES DEL EJE SAS'],
            ['800122811', 'JURIDICA', 'COTEL SAS'],
            ['900405605', 'JURIDICA', 'SOLUCION FERRETERA SAS'],
            ['901062954', 'JURIDICA', 'CALZADO Y DOTACIONES J&G SAS'],
            ['830015699', 'JURIDICA', 'ESCALERAS DE COLOMBIA DISTRIBUCIONES LTDA'],
            ['1088309084', 'NATURAL', 'KAREN VELEZ SANTA CRUZ'],
            ['900258044', 'JURIDICA', 'ALUMFER EJE CAFETERO S.A.S'],
            ['890937010', 'JURIDICA', 'CASA FERRETERA SA'],
            ['51595564', 'JURIDICA', 'LUCIA BEATRIZ RINCON URIBE'],
            ['805016997', 'JURIDICA', 'CONFECCIONES Y PROMOCIONES SAS'],
            ['900721740', 'JURIDICA', 'ASESORES EN SISTEMAS DE COMPUTO PARTS S.A.S'],
            ['80205905', 'JURIDICA', 'JHONATAN RICARDO BARRERO'],
            ['860009826', 'JURIDICA', 'ASSA ABLOY COLOMBIA SAS'],
            ['900776951', 'JURIDICA', 'VELONET SAS'],
            ['901472858', 'JURIDICA', 'HERRAVENTAS SAS'],
            ['900155107', 'JURIDICA', 'CENCOSUD COLOMBIA S.A.'],
            ['900017447', 'JURIDICA', 'FALABELLA DE COLOMBIA SA'],
            ['901672735', 'JURIDICA', 'DEVX SAS'],
            ['900883950', 'JURIDICA', 'MUEBLES COMODOS SAS'],
            ['901302261', 'JURIDICA', 'WIFIREDES TELECOMUNICACIONES SAS'],
            ['70137390', 'JURIDICA', 'WALTER HERNAN MUÑETON TABAREZ'],
            ['860404791', 'JURIDICA', 'MUEBLES Y PLÁSTICOS S.A.S.'],
            ['816007826', 'JURIDICA', 'ASEQUIN SAS'],
            ['1020428729', 'NATURAL', 'NATACHA CHICA MARTINEZ'],
            ['805006014', 'JURIDICA', 'DIRECTV COLOMBIA LTDA'],
            ['1125268048', 'NATURAL', 'JULI NATHALIE NEIRA PAEZ'],
            ['1062811059', 'NATURAL', 'JHON JANER LOPEZ GIRALDO'],
            ['901401960', 'JURIDICA', 'SMD SEGURIDAD SAS'],
            ['900950854', 'JURIDICA', 'TECHWORLD SAS'],
            ['816006044', 'JURIDICA', 'LA GRAN FERRETERIA SAS'],
            ['901579337', 'JURIDICA', 'INVERSIONES LA BROCA SAS'],
            ['901963742', 'JURIDICA', 'LIZA SAS'],
        ];

        $rows = array_map(fn ($p) => [
            'nit'        => $p[0],
            'naturaleza' => $p[1],
            'nombre'     => $p[2],
            'created_at' => now(),
            'updated_at' => now(),
        ], $proveedores);

        DB::table('proveedores')->insert($rows);
    }

    public function down(): void
    {
        Schema::dropIfExists('proveedores');
    }
};
