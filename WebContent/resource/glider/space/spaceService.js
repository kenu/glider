(function ($) {
	"use strict";

	GliderWiki.namespace("Space");

	GliderWiki.Space.Write = Class.extend({
		init: function($writeArea, $loginUserName, $userIdx) {
			var me = this;
			me.$writeArea = $writeArea;
			me.$writeForm = $("#WeSpace", me.$writeArea);
			me.$viewAuthorityBtn = $("input:radio[name=we_view_privacy]", me.$writeArea);
			me.$editAuthorityBtn = $("input:radio[name=we_edit_privacy]", me.$writeArea);
			me.$weSpaceIdx = $("#we_space_idx", me.$writeForm);
			me.$loginUserName = $loginUserName;
			me.$userIdx = $userIdx;
			me.$method = $("#_method", me.$writeForm);
			me.$viewData = $("#we_view_data", me.$writeForm);
			me.$viewName = $("#we_view_name", me.$writeForm);
			me.$editData = $("#we_edit_data", me.$writeForm);
			me.$editName = $("#we_edit_name", me.$writeForm);
		},
		create: function() {
			var me = this;

			me.uploadTempFile();	// 이미지 업로드 (미리보기)
			me.checkGroup();		// 그룹 조회 권한, 수정 권한 
			me.checkExposed();		// 정보 공개에 따른 라디오버튼 비활성화 
			//me.userSelect();
			me.writeFormSubmit();	// 폼 서브밋 
			me.preview();
			me.nameDuplicateCheck();
		},
		uploadTempFile: function() {
			var me = this;
			var $imageForm = $("#imageForm", me.$writeArea);
			var $uploadBtn = $("#uploadFile", $imageForm);

			$uploadBtn.change(function(e) {
				e.preventDefault();
				$imageForm.ajaxSubmit({
					type:'post',
					dataType: 'json',
					url: '/space/logo/preUpload',
					success: function(data) {
						if(data.result == 1) {
							var $preViewDiv = $("#previewImg", me.$writeArea);
							var imgSrc = data.filePath+data.saveFileName;

							$("#we_upload_imgName", me.$writeForm).val(imgSrc);
							$preViewDiv.html("<img src='/resource/temp"+imgSrc+"' id=\"uploadPreviewImg\" width=\"200\">");
						}else{
							GliderWiki.alert("에러메세지",data.msg);
						}
					}
				});

				return false;
			});
		},
		checkGroup: function() {
			var me = this;
		
			//console.log("me.$userIdx : "  + me.$userIdx);
			
			if(me.$userIdx == undefined) { 
				GliderWiki.alert("알림","로그인 정보가 없습니다.");
				$("#okBtn").on("click", function() {
					history.back();
				});	
			}
			
			// 공간 조회 권한 
			me.$viewAuthorityBtn.click(function() {
				
				var checkType = $(":input:radio[name=we_view_privacy]:checked").val();

				//console.log("checkType : " + checkType);  // GROUP, USER
				
				if(checkType != 'ALLGROUP') {
					me.$viewData.val("");
					me.$viewName.val("");
					
					// 공간 번호가 있을 경우 공간정보 수정화면임 
					if(me.$weSpaceIdx.val().length > 0) {
						var spaceIdx = $(this).data("spaceIdx");
						// 수정일 경우 옵션 값을 변경한 후 호출한다.
						if(checkType == 'GROUP') {
							spaceService.groupSelectedList(spaceIdx, callBackUpdateViewGroupList);
						} else if(checkType == 'USER') {
							spaceService.userSelectedList(spaceIdx, callBackUpdateViewUserList);
						}						
					}else{
						if(checkType == 'GROUP') {
							CommonService.getGroupList(me.$userIdx, callBackViewGroupList);
						} else if(checkType == 'USER') {
							var userNick = "";		// 닉네임
							var userEmail = "";		// 이메일
							var userName ="";		// 이름

							CommonService.getWeUserList(me.$userIdx, userNick, userEmail, userName, callBackViewUserList);
						}
					}

				}
			});

			// 공간 수정 권한 
			me.$editAuthorityBtn.click(function() {
				//console.log("$editAuthorityBtn");
				var checkType = $(":input:radio[name=we_edit_privacy]:checked").val();
				//console.log("checkType : " + checkType);  // GROUP, USER
				if(checkType != 'ALLGROUP') {
					me.$editData.val("");
					me.$editName.val("");					
					
					if(me.$weSpaceIdx.val().length > 0) {
						var spaceIdx = $(this).data("spaceIdx");

						if(checkType == 'GROUP') {
							spaceService.groupSelectedList(spaceIdx, callBackUpdateEditGroupList);
						} else if(checkType == 'USER') {
							spaceService.userSelectedList(spaceIdx, callBackUpdateEditUserList);
						}
						
					}else{
						if(checkType == 'GROUP') {
							CommonService.getGroupList(me.$userIdx, callBackEditGroupList);
						} else if(checkType == 'USER') {
							var userNick = "";		// 닉네임
							var userEmail = "";		// 이메일
							var userName ="";		// 이름

							CommonService.getWeUserList(me.$userIdx, userNick, userEmail, userName, callBackEditUserList);
						}
					}
				}
			});
		},
		checkExposed : function() {
			$("input[name=we_space_exposed]").live("click", function() {	
				var exposed =  $(this).val();
				//console.log("val = " + exposed)
				if(exposed == 'N') {
					$("#we_view_privacy1").attr("disabled", true);
					$("#we_edit_privacy1").attr("disabled", true);
					$("#we_view_privacy1").attr("checked", false);
					$("#we_edit_privacy1").attr("checked", false);
				} else {
					$("#we_view_privacy1").attr("disabled", false);
					$("#we_edit_privacy1").attr("disabled", false);
				}
			});			
		},
		
		writeFormSubmit: function() {
			var me = this;

			me.$writeForm.validate({
				submitHandler:function(form) {
					//공간생성일때 공간이름 중복체크를 했는지 여부 체크
					var nameCheckFlag = $("#spaceNameCheck").val();
					var spaceName = $("#we_space_name", me.$writeForm).val();
					var spaceDesc = $("#we_space_desc", me.$writeForm).val();
					var exposed = $(":input:radio[name=we_space_exposed]:checked").val();
					var viewCheckType = $(":input:radio[name=we_view_privacy]:checked").val();
					var editCheckType = $(":input:radio[name=we_edit_privacy]:checked").val();

					if(GliderWiki.Utils.isEmpty(spaceName)) {					
						GliderWiki.alert("알림","공간 제목을 입력하세요.");
						return false;
					}
					
					if(GliderWiki.Utils.isEmpty(me.$weSpaceIdx.val()) && nameCheckFlag == 0) {
						GliderWiki.alert("알림","공간이름 중복체크를 하셔야 합니다.");
						return false;
					}
					
					if(GliderWiki.Utils.isEmpty(spaceDesc)) {					
						GliderWiki.alert("알림","공간 설명을 입력하세요.");
						return false;
					}
					
					if(GliderWiki.Utils.isEmpty(exposed)) {					
						GliderWiki.alert("알림","공간 Privacy를 선택하세요.");
						return false;
					}

					if(GliderWiki.Utils.isEmpty(viewCheckType)) {
						GliderWiki.alert("알림","공간보기 권한을 선택하세요.");
						return false;
					}

					if(GliderWiki.Utils.isEmpty(editCheckType)) {
						GliderWiki.alert("알림","공간수정 권한을 선택하세요.");
						return false;
					}

					if(viewCheckType == 'ALLGROUP') {
						me.$viewData.val("");
						me.$viewName.val("");
					}

					if(editCheckType == 'ALLGROUP') {
						me.$editData.val("");
						me.$editName.val("");
					}

					//그룹 혹은 구성원을 선택했다면 그 세부사항도 선택했는지 체크함
					if(me.GroupAndUserSelectedCheck("view", viewCheckType)) {
						GliderWiki.alert("알림","그룹 혹은 구성원을 선택해야 합니다.");
						return false;
					}

					if(me.GroupAndUserSelectedCheck("edit", editCheckType)) {
						GliderWiki.alert("알림","그룹 혹은 구성원을 선택해야 합니다.");
						return false;
					}

					//이미지 업로드 여부 체크(저장할때만)
					if(GliderWiki.Utils.isEmpty(me.$weSpaceIdx.val())) {
						if($("#uploadFile").val().length < 1) {
							GliderWiki.alert("알림","공간 이미지를 업로드 하세요.");
							return false;
						}
					}

					if(me.$weSpaceIdx.val()) {
						me.$method.val("PUT");
					}

					form.submit();
				}
				
			});

			$(document).on("click", ".spaceCreate", function() {
				jQuery($("#formSubmitBtn")).trigger('submit');
			});
			
			
		},
		GroupAndUserSelectedCheck: function(authorityType, checkType) {
			var me = this;

			if(checkType == 'GROUP' || checkType == 'USER') {
				if(authorityType == 'view') {
					if(GliderWiki.Utils.isEmpty(me.$viewData.val())) {
						return true;
					}
				}
				if(authorityType == 'edit') {
					if(GliderWiki.Utils.isEmpty(me.$editData.val())) {
						return true;
					}
				}
			}

			return false;
		},
		preview: function() {
			var me = this;
			var previewBtn = $(".preview", me.$writeForm);

			$(document).on("click", ".preview", function() {
				var spaceName = $("#we_space_name", me.$writeForm).val();
				var spaceDesc = $("#we_space_desc", me.$writeForm).val();
				var exposed = me.getValueCheck("exposed", $(":input:radio[name=we_space_exposed]:checked").val());
				var viewPrivacy = me.getValueCheck("viewPrivacy", $(":input:radio[name=we_view_privacy]:checked").val());
				var viewUserList = $("#we_view_name").val();
				var editPrivacy = me.getValueCheck("editPrivacy",$(":input:radio[name=we_edit_privacy]:checked").val());
				var editUserList = $("#we_edit_name").val();
				var fileName = $("#uploadPreviewImg").attr("src");

				if(viewPrivacy !='전체' && !GliderWiki.Utils.isEmpty(viewPrivacy)) {
					viewUserList = "("+viewUserList+")";
				}

				if(editPrivacy !='전체' && !GliderWiki.Utils.isEmpty(editPrivacy)) {
					editUserList = "("+editUserList+")";
				}

				var previewHtml = ['공간이름 : ' + spaceName +'<br>',
				'				    공간설명 : ' + spaceDesc +'<br>',
				'					공개여부 : ' + exposed   +'<br>',
				'					공간관리자 : ' + me.$loginUserName +'<br>',
				'					조회정책 : ' + viewPrivacy + viewUserList+'<br>',
				'					수정정책 : ' + editPrivacy + editUserList+'<br>',
				'					공간로고 : <img src="' + fileName   +'" width=\"168px\" height=\"100px\" /><br>',
				''].join('\n');

				GliderWiki.preview(previewHtml,"공간 미리보기");
			});
		},
		getValueCheck: function(type, val) {
			if(typeof val == "undefined") {
				return '';
			}

			switch(type) {
			case 'exposed':
				if(val =="Y") {
					return "공개";
					break;
				}
				return "비공개";
				break;
			case 'viewPrivacy':
			case 'editPrivacy':
				if(val =="ALLGROUP") {
					return "전체";
					break;
				}else if(val =="GROUP") {
					return "그룹";
					break;
				}else{
					return "구성원";
					break;
				}
			default:
				break;
			}
		},
		nameDuplicateCheck: function() {
			var me = this;
			var checkBtn = $(".nameCheck", me.$writeForm);

			checkBtn.unbind("click").bind("click", function() {
				var spaceName = $("#we_space_name", me.$writeForm).val();

				if(GliderWiki.Utils.isEmpty(spaceName)) {
					GliderWiki.alert("에러메세지","공간이름을 입력하세요.");
					return false;
				}

				$.post("/space/nameDuplicateCheck", {spaceName:spaceName}, function(data){

					if(data == 'SUCCESS') {
						var nameCheckFlag = $("#spaceNameCheck");
						nameCheckFlag.val("1");

						GliderWiki.alert("공간","사용가능한 공간이름입니다");
					}else{
						GliderWiki.alert("에러메세지","다른 공간이름을 사용하세요");
					}
				});
			});
		}
		
	});

	GliderWiki.Space.Show = Class.extend({
		init: function() {
			var me = this;

		},
		action: function() {
			var me = this;

			me.participantDelete();
			me.joinRequest();
			/* 최근 업데이트 펼치기 */
			me.moreUpdate();
			/* 최근 업데이트 닫힘  */
			me.setUpdate();
		},
		participantDelete: function() {

			$(".viewDelete").bind("click",function(e) {
				e.preventDefault();
				var spaceIdx = $(this).data("spaceIdx");
				var groupIdx = $(this).data("groupIdx");
				var authorityType = $(this).data("authorityType");
				$.post("/space/group/delete", {spaceIdx:spaceIdx, groupIdx:groupIdx, authorityType:authorityType}, function(data){
					if(data == 1) {
						GliderWiki.alert("공간","삭제되었습니다");
					}else{
						GliderWiki.alert("공간","삭제되지 않았습니다");
					}

				});
			});

			$(".viewDelete1").bind("click",function() {
				var spaceIdx = $(this).data("spaceIdx");
				var userIdx = $(this).data("userIdx");
				var authorityType = $(this).data("authorityType");
				$.post("/space/user/delete", {spaceIdx:spaceIdx, userIdx:userIdx, authorityType:authorityType}, function(data){
					if(data == 1) {
						GliderWiki.alert("공간","삭제되었습니다");
					}else{
						GliderWiki.alert("공간","삭제되지 않았습니다");
					}

				});
			});
		},
		joinRequest: function() {
			$(".joinRequest").bind("click",function() {
				var spaceIdx = $(this).data("spaceIdx");
				$.post("/space/joinRequest", {spaceIdx:spaceIdx}, function(data){
					if(data == 1) {
						GliderWiki.alert("공간","가입신청 되었습니다.");
					}else if(data == -1){
						GliderWiki.alert("공간","이미 신청하셨습니다.");
					}else {
						GliderWiki.alert("공간","가입신청되지 않았습니다");
					}
				});
			});
		},
		moreUpdate : function() {
			var me = this;
			
			$(document).on("click", "#getUpdate", function(e) {
				e.preventDefault();				
				var rowCount = $('#recentUpdate > li').length;
				var userIdx = me.$loginUserIdx;
				
				if(rowCount < 5) {
					GliderWiki.alert('알림', '더이상 조회 건수가 없습니다.');
					return;
				}
				
				ajaxUpdate(userIdx, rowCount, 5);
				
			});
		}, 
		setUpdate : function() {
			var me = this;
			$(document).on("click", "#setUpdate", function(e) {
				e.preventDefault();				
				var rowCount = $('#recentUpdate > li').length;
				
				if(rowCount < 6) {
					GliderWiki.alert('알림', '최근 업데이트 목록을 더이상 접어보기 할 수 없습니다.');
					return;
				}
				
				var userIdx = me.$loginUserIdx;
				var url =  "/moreitem/update";
				var type = "recentUpdate";
				
				// 초기 화면 세팅 공통 메소드 콜
				initUpdate(userIdx, url, type);
			});
		}
	});

	GliderWiki.Space.List = Class.extend({
		init: function() {

		},
		action: function() {
			var me = this;

			me.addFavorite();
			me.delFavorite();
		},
		addFavorite: function() {
			$(document).on("click", ".addFavorBtn", function(e) {
				e.preventDefault()
				var spaceIdx = $(this).data("spaceIdx");
				var obj = $(this);

				GliderWiki.confirm('알림 ', '해당 공간을 즐겨찾기에 추가하시겠습니까?',  function() {
					$.post("/space/addFavorite", {spaceIdx:spaceIdx}, function(data){
						if(data == 1) {
							obj.removeClass("unstar");
							obj.removeClass("addFavorBtn");
							obj.addClass("star");
							obj.addClass("delFavorBtn");
							GliderWiki.alert("공간","추가되었습니다.");
						}else if(data == -1){
							GliderWiki.alert("공간","이미 추가되었습니다.");
						}else{
							GliderWiki.alert("공간","추가되지 않았습니다.");
						}
					});
				});
			});
		},
		delFavorite: function() {
			var me = this;

			$(document).on("click", ".delFavorBtn", function(e) {
				e.preventDefault();

				var spaceIdx = $(this).data("spaceIdx");
				var type = $(this).data("favoriteType");
				var obj = $(this);

				GliderWiki.confirm("공간 즐겨찾기제거","해당공간을 즐겨찾기에서 삭제하시겠습니까?",
					function() {
						$.post("/delFavorite", {spaceIdx:spaceIdx, favoriteType:type}, function(data){
							if(data == 1) {
								obj.removeClass("star");
								obj.removeClass("delFavorBtn");
								obj.addClass("unstar");
								obj.addClass("addFavorBtn");
								GliderWiki.alert("공간 즐겨찾기","삭제되었습니다");
							}else{
								GliderWiki.alert("공간 즐겨찾기","삭제되지 않았습니다");
							}
						});
					}
				);
			});
		}
	});
	
	//최근 업데이트 초기화 
	function initUpdate(userIdx, url, type) {
		GliderWiki.confirm("알림", "최근 업데이트 목록을 초기화 하겠습니까?",
				function() {
			$('#'+type+' > li').remove();
			ajaxUpdate(userIdx, 0, 5);
		});
	}
	
	//ajax 콜 공통 함수 (update)
	function ajaxUpdate(userIdx, startRow, endRow) {
		$.ajax({
			type:"GET"
			,url:"/moreitem/update"
			,data:{"userIdx":userIdx,"startRow":startRow,"endRow":endRow}
			,dataType:"json"
			,success:function(rtnObj){					
				if(rtnObj.result == '1'){
					callBackRecentUpdate(rtnObj);
				} else if(rtnObj.result == '0'){
					GliderWiki.alert('알림', '더이상 조회 건수가 없습니다.');
				} else if(rtnObj.result == '-1'){
					GliderWiki.alert('알림', '에러가 발생하였습니다.');
				}
			}
		});
	}
	
	function callBackRecentUpdate(rtnObj) {
		if(rtnObj != null) {
			var recentUpdate = rtnObj.recentList;
			var inHtml = "";
			var listSize = recentUpdate.length;
			var title;
			var text; 
			for(var i = 0 ; i < listSize ; i++){
				if(recentUpdate[i].we_wiki_title.length > 19 ) { 
					title = recentUpdate[i].we_wiki_title.substr(0,19) + "...";
				} else { 
					title = recentUpdate[i].we_wiki_title; 
				}
				
				if(recentUpdate[i].we_wiki_text.length > 40) {
					text = recentUpdate[i].we_wiki_text.substr(0,40) + "...";
				} else {
					text = recentUpdate[i].we_wiki_text;
				}
				inHtml += "<li>";
				inHtml += "    <div class=\"thumb\">";
				inHtml += "        <img src=\"/resource/real"+recentUpdate[i].profileImg+"\" width=\"40px\" height=\"40px\" onerror=\"this.src='/resource/glider/front/images/default_img.jpg';\"/>";
				inHtml += "    </div>";
				inHtml += "    <div class=\"user\">";
				inHtml += "        <span class=\"name\">"; 
				inHtml += "            <a href=\"#\" role=\"button\" class=\"tooltip\" data-user-idx=\""+recentUpdate[i].we_user_idx+"\">"+recentUpdate[i].we_user_nick+"</a>";
				inHtml += "        </span>";
				inHtml += "        <span class=\"time\">"+recentUpdate[i].insert_date+"</span>";
				inHtml += "    </div>";
				inHtml += "    <div class=\"cont\">";
				inHtml += "    <div style=\"font-weight:bold; color : #666;\"><a href=\"/wiki/"+recentUpdate[i].we_wiki_idx+"\">"+title+"</a></div>";
				inHtml += text;
				inHtml += "    </div>";				
				inHtml += "</li>";
				
			}
			$("#recentUpdate").append(inHtml);
		}
	}
	
	// 조회 권한 사용자 목록 보기  
	function callBackViewUserList(obj) {
		var weUserList = eval(obj);

		if(weUserList != null) {
			$.userListLayer({
				'userList'     : weUserList,
				'authorityType': 'view',
				'type'         : 'user'
			});
		}
	}

	
	// 조회 권한 그룹 목록 보기 
	function callBackViewGroupList(obj) {
		var weGroupList = eval(obj);

		if(weGroupList != null) {
			$.groupInfoLayer({
				'weGroupList'  : weGroupList,
				'authorityType': 'view',
				'type'         : 'groupInfo'
			});
		}
	}
	
	
	// 수정 권한 사용자 목록 보기  
	function callBackEditUserList(obj) {
		var weUserList = eval(obj);
		//console.log("weUserList : " +weUserList);
		if(weUserList != null) {
			$.userListLayer({
				'userList'     : weUserList,
				'authorityType': 'edit',
				'type'         : 'user'
			});
		}
	}
	
	// 수정 권한 그룹 목록 보기 
	function callBackEditGroupList(obj) {
		var weGroupList = eval(obj);

		if(weGroupList != null) {
			$.groupInfoLayer({
				'weGroupList'  : weGroupList,
				'authorityType': 'edit',
				'type'         : 'groupInfo'
			});
		}
	}
	
	
	// 공간정보 수정시 조회 권한 사용자 목록 보기  
	function callBackUpdateViewUserList(obj) {
		var weUserList = eval(obj);

		if(weUserList != null) {
			$.userListLayer({
				'userList'     : weUserList,
				'authorityType': 'view',
				'type'         : 'update'
			});
		}
	}

	
	// 공간정보 수정시 조회 권한 그룹 목록 보기 
	function callBackUpdateViewGroupList(obj) {
		var weGroupList = eval(obj);

		if(weGroupList != null) {
			$.groupInfoLayer({
				'weGroupList'  : weGroupList,
				'authorityType': 'view',
				'type'         : 'update'
			});
		}
	}
	
	
	// 공간정보 수정시 수정 권한 사용자 목록 보기  
	function callBackUpdateEditUserList(obj) {
		var weUserList = eval(obj);
		//console.log("weUserList : " +weUserList);
		if(weUserList != null) {
			$.userListLayer({
				'userList'     : weUserList,
				'authorityType': 'edit',
				'type'         : 'update'
			});
		}
	}
	
	// 공간정보 수정시 수정 권한 그룹 목록 보기 
	function callBackUpdateEditGroupList(obj) {
		var weGroupList = eval(obj);

		if(weGroupList != null) {
			$.groupInfoLayer({
				'weGroupList'  : weGroupList,
				'authorityType': 'edit',
				'type'         : 'update'
			});
		}
	}
	
		
})(jQuery);